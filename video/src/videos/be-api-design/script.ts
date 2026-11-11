import type { NarrationScript } from "../../narration/types";
import { COURSE_MIN_PAUSE } from "../../editorial/course.ts";

/**
 * Narration for "API design" (16:9), Part 3 of the Backend / Software
 * Engineer interview prep videos
 * (agent-outputs/20261106-backend-interview-video-plan.md, "3, API design"),
 * after content/interview/backend-engineer/api-design.mdx. It answers all
 * sixteen of the page's questions: ten worked through, numbered aloud and
 * read in the page's words, then six quick ones, numbered on screen only.
 *
 *   1. "What makes an API RESTful?" ("rest").
 *   2. "Walk through the main HTTP methods and their semantics." ("methods").
 *   3. "What do the HTTP status code classes mean?" ("codes") and 4. "401 vs
 *      403, what is the difference?" ("authn"), one scene.
 *   5. "What is idempotency and why does it matter for APIs?" ("idem").
 *   6. "How do you paginate a large collection?" ("page").
 *   7. "Sessions vs JWT vs OAuth, how do they relate?" ("auth") and 8. "When
 *      would you choose stateful sessions over stateless JWTs?" ("revoke"),
 *      one scene.
 *   9. "How do you rate-limit an API, and how should clients learn their
 *      limits?" ("limit"), from the client's side, as the plan asks: the
 *      429, the headers, backing off. Part 2 (Scaling) answers how the
 *      server counts, and the beat says so.
 *   10. "REST vs GraphQL vs gRPC, when does each fit?" ("styles").
 *   Quick ("rapid-in"): 11. "How should you name REST resources?"; 12. "How
 *   do you design a clean resource API for, say, a blog?"; 13. "How do you
 *   version an API?"; 14. "How should an API handle errors?"; 15. "What is
 *   HATEOAS, and is it required for REST?"; 16. "What is content
 *   negotiation?"
 *
 * The opening takes up Part 2's bridge (every box talks to the others
 * through an API) without naming it, so it stands alone; the close bridges
 * into Part 4 (behind the API, the data has to live somewhere). The page's
 * blog (articles and their comments) is the example throughout.
 *
 * On screen, beat by beat (what phase 2 builds; red the trap, green the right
 * answer, yellow what the narration points at, blue data):
 *   hook: three boxes (client, service, service) and the arrows between
 *     them; each arrow labelled "API" as it is said; "predictable,
 *     consistent, hard to misuse" under them. hook-blog: the blog's two
 *     resources as cards, articles and comments. plan: ten numbered squares
 *     and six smaller ones.
 *   rest: QuestionCard 1; a resource card "/articles/42" with GET, PUT,
 *     PATCH, DELETE around it. rest-nouns: "/articles/42" in green beside
 *     "/getArticle" struck in red; then a request card carrying its token
 *     and its parameters, and the server with no memory drawn (an empty
 *     box). rest-why: two servers behind a load balancer, the next request
 *     going to the other one, answered the same.
 *   methods: QuestionCard 2; a two-column grid headed safe and idempotent.
 *     methods-list: one row per method, ticks filling as each is said
 *     (GET both; PUT, DELETE idempotent; POST neither; PATCH "not
 *     necessarily"). methods-delete: two DELETEs, 204 then 404 (yellow on
 *     the responses), the article gone after either: "same state".
 *     methods-patch: two PATCH bodies, status = published (green, repeat it
 *     and nothing changes) against views + 1 (red, it climbs).
 *   codes: QuestionCard 3; five columns, 2xx to 5xx, the page's codes in
 *     each. codes-why: a client branching on the code, not on a string.
 *   authn: QuestionCard 4 over the 4xx column, 401 and 403 lifted out.
 *     authn-401: a request with no key, 401 and its WWW-Authenticate
 *     header. authn-403: a request with a valid key and a padlocked
 *     resource, 403; "log in again" struck. authn-404: the same request
 *     answered 404, the resource drawn faint.
 *   idem: QuestionCard 5. idem-retry: a client, a server, a request that
 *     lands and a response that is lost (a broken arrow), the client's
 *     clock running out. idem-run: three POSTs of $50.00, three rows in
 *     payments, "3 charges, $150.00" in red (the run). idem-key: the same
 *     three POSTs, each carrying "Idempotency-Key: 9c1f2a7e-…", one row,
 *     the second and third answered with payment 1: "3 requests, 1 charge"
 *     (green). idem-race: the duplicate insert refused, Postgres's error
 *     ("violates unique constraint …") in the soft ink.
 *   page: QuestionCard 6; "?limit=20&offset=40" as the page's
 *     SyntaxBreakdown. page-cost: "PostgreSQL 18, 100,000 articles" as the
 *     figure's source line; three bars on a log scale, rows read for
 *     pages 1, 500 and 5,000: 20, 10,000, 100,000 (each from the plan's
 *     Index Scan "actual rows"). page-drift: page one ending on article
 *     99,981; article 100,001 arrives at the top; page two by offset starting
 *     on 99,981 again (red). page-cursor: the cursor "eyJpZCI6OTk5ODF9" and
 *     what it decodes to, {"id": 99981}; page two by cursor starting at
 *     99,980 (green); the bars for the cursor flat at 20 at every depth.
 *     page-cost-two: "no page 500 jump" and "(created_at, id)".
 *   auth: QuestionCard 7; three cards, session, JWT, OAuth, each with the
 *     question it answers. auth-session: a cookie holding the 43-character
 *     ID, an arrow into the server's session store. auth-jwt: the 164-character
 *     token in three colored parts; the middle part decoded into its claims
 *     (sub 42, role editor, exp); the role changed to admin and the
 *     signature check failing (red). auth-oauth: a user, an app and a
 *     service; the app reaching the service with a token, no password
 *     crossing.
 *   revoke: QuestionCard 8. revoke-session: two servers reading one shared
 *     session store; the session deleted from it, the next request refused
 *     at once (green). revoke-jwt: the same
 *     token still accepted until "exp" on a clock (red). revoke-hybrid: a
 *     15-minute access token beside a long refresh token with a revoke
 *     switch; the 15 minutes marked as the window a banned user keeps.
 *   limit: QuestionCard 9; a bucket icon labelled "Part 2: how the server
 *     counts". limit-contract: an example 429 response, the video's own
 *     values (X-RateLimit-Limit: 100, X-RateLimit-Remaining: 0,
 *     X-RateLimit-Reset, Retry-After: 30), each header lit as it is named.
 *     limit-client: a client gauge reading Remaining and slowing; then a
 *     timeline of waits: Retry-After first, then each refusal doubling the
 *     wait, each wait with a spread of jitter. limit-safe: the same backoff under a timeout and a
 *     5xx, where the outcome is unknown; GET, PUT and a keyed POST ticked as
 *     safe to repeat there, a bare POST not.
 *   styles: QuestionCard 10; three columns. styles-rest: REST's screen
 *     making three round trips (article, author, comments), extra fields
 *     faded. styles-graphql: one query naming its fields, one response;
 *     a cache and a meter greyed. styles-grpc: two services joined by a
 *     binary stream. styles-mix: the edge with REST, the inside with gRPC.
 *   rapid-in: the RapidFire list, 11 to 16. r-naming: the page's three
 *     paths, and "PATCH /articles/42 {status: published}". r-blog: the
 *     page's verb and path table, then "201 Created, Location:
 *     /articles/43". r-version: "/v1/orders"; a removed field (red), an
 *     added optional one (green). r-errors: the page's 422 body.
 *     r-hateoas: a response with "next" and "comments" links; "REST as
 *     defined: required" beside "in practice: often skipped". r-content:
 *     Accept and Content-Type on two arrows; 3,663 bytes against 610.
 *   next: the RapidFire list complete; NextLine "Next: databases".
 *
 * Facts. check.mjs writes results.json, which data.ts reads:
 *   - "page", on the site's Postgres (PGlite 0.5.8, PostgreSQL 18.3):
 *     articles, 100,000 rows, newest first, 20 a page. OFFSET for page 1,
 *     500 and 5,000: the Index Scan Backward returns 20, 10,000 and 100,000
 *     rows into the Limit (EXPLAIN ANALYZE "actual rows"), the page's "page
 *     500 costs five hundred times page one". The cursor (id < the last id
 *     of the page before) returns 20 at both depths, and page 500 by either
 *     method is the same 20 rows (EXCEPT finds none different). Drift: page
 *     one ends on article 99,981; after article 100,001 is inserted, page
 *     two by offset starts on 99,981, by cursor on 99,980.
 *   - "idem", on the same Postgres: three plain POSTs of 5000 cents (the
 *     page's example body, {"amount": 5000, "currency": "usd"}, read as
 *     cents, the smallest unit of the currency: "fifty dollars"; the body on
 *     screen keeps the page's 5000) make three payments, 15,000
 *     cents; with the page's Idempotency-Key and a unique constraint, the
 *     first insert returns payment 1 and the next two insert nothing, so one
 *     payment, 5,000 cents. A plain insert with the same key: "duplicate key
 *     value violates unique constraint "payments_idempotency_key_key"".
 *   - "auth", in Node's crypto: an HS256 JSON Web Token over the video's own
 *     claims (sub 42, role editor, a 15-minute exp, the hybrid's assumed
 *     lifetime, said "say fifteen minutes") is 164 characters; its payload
 *     decodes without the key; a payload changed to role admin with the old
 *     signature fails verification. A 32-byte session ID in base64url is 43
 *     characters.
 *   - "r-content": the page of 20 articles as the video's own JSON body
 *     (id, title, status, author, two tags, a comment count, a timestamp,
 *     and the cursor) is 3,663 bytes, 610 gzipped, about a sixth.
 *   - The methods' properties, the status classes and codes, 401 and 403,
 *     the rate-limit headers, the three API styles, versioning, errors,
 *     HATEOAS and content negotiation are the page's own answers, drawn,
 *     with no numbers. Points that go past the page, each from its
 *     standard rather than from a run:
 *       - RFC 9110 (HTTP Semantics), 15.5.2: a server sending 401 must
 *         send a WWW-Authenticate challenge (the page says "normally").
 *       - RFC 9110, 9.2.2: idempotency is about the intended effect on the
 *         server, not the response, so a repeated DELETE may answer 404 and
 *         still be idempotent.
 *       - RFC 9110, 15.5.4: a server that wants to hide that a forbidden
 *         resource exists may answer 404 instead of 403 ("authn-404").
 *       - Fielding's dissertation (2000), 5.1.5, lists hypermedia as the
 *         engine of application state among REST's four interface
 *         constraints, so strictly REST requires it; the page's "aspirational
 *         rather than required" describes practice, which "r-hateoas" says
 *         as practice (reported to the coordinator).
 *       - Backing off with jitter after a 429 or a 5xx, and repeating only
 *         safe or keyed requests after one ("limit-client", "limit-safe"):
 *         the page's "so a well-behaved client can back off", carried to its
 *         follow-up with question five's idempotency.
 *     The example 429's header values (100, 0, 30) are the video's own,
 *     shown as an example, never as a measured response.
 *   - No API product is named: the page names none. Postgres is named once,
 *     glossed, for the runs ("page-cost").
 *
 * Written for Drew's ear: status codes as they are said ("four oh one",
 * "two oh one", "four twenty-nine"); initialisms in plain caps (API, HTTP,
 * URL, ID, JWT), with the ones said as words (REST, RESTful, JSON, OAuth,
 * HATEOAS) reported for the lexicon, and gRPC, spelled out but in mixed
 * case, reported to be confirmed; the HTTP methods in caps, as they are
 * written (GET, PUT, POST, PATCH, DELETE), to be confirmed as said as words,
 * as SELECT and JOIN are; no sentence opening on "A" before an initialism;
 * JWT and HATEOAS expanded once; the rate-limit headers described in words
 * ("the limit, what's remaining"), Retry-After alone said by name.
 */
export const script: NarrationScript = {
  id: "be-api-design",
  voice: "drew",
  minPause: COURSE_MIN_PAUSE,
  tail: 2.6,
  beats: [
    // ── Opening ───────────────────────────────────────────────────────────
    {
      id: "hook",
      scene: true,
      text: "Draw any backend, and every arrow between two boxes is an API: one side asks, the other answers, and both must agree on how. The interview tests whether you can design that agreement to be predictable, consistent, and hard to misuse.",
      pauseAfter: 0.6,
    },
    {
      id: "hook-blog",
      text: "Most answers here use one example, the page's own: a blog, with articles and their comments.",
      pauseAfter: 0.6,
    },
    {
      id: "plan",
      text: "Sixteen questions. Ten are worked through, and six go quickly at the end.",
      pauseAfter: 0.7,
    },

    // ── 1. RESTful ────────────────────────────────────────────────────────
    {
      id: "rest",
      scene: true,
      text: "Question one. What makes an API RESTful? It models the domain as resources, each with a URL, and acts on them with the standard HTTP methods.",
      pauseAfter: 0.5,
    },
    {
      id: "rest-nouns",
      text: "So paths are nouns, like articles slash forty-two, never a verb like get article. Each request carries everything the server needs, with no session kept between requests. And methods and status codes mean what HTTP says they mean.",
      pauseAfter: 0.6,
    },
    {
      id: "rest-why",
      text: "Done well, a developer can guess the next endpoint. And because no request depends on the last, any server behind a load balancer can answer the next one.",
      pauseAfter: 0.8,
    },

    // ── 2. HTTP methods ───────────────────────────────────────────────────
    {
      id: "methods",
      scene: true,
      text: "Question two. Walk through the main HTTP methods and their semantics. Two properties sort them. Safe: the server's state doesn't change. Idempotent: repeating the request has the same effect as sending it once.",
      pauseAfter: 0.6,
    },
    {
      id: "methods-list",
      text: "GET reads, and is both. PUT replaces a whole resource, and DELETE removes one: both idempotent. POST submits data to be processed, like a new article, and is neither. PATCH changes part of a resource, and isn't necessarily idempotent.",
      pauseAfter: 0.7,
    },
    {
      id: "methods-delete",
      text: "Two follow-ups. A second delete may answer not found, a different response, but the article is gone either way, so delete is still idempotent: the property is about state, not the reply.",
      pauseAfter: 0.6,
    },
    {
      id: "methods-patch",
      text: "And a patch that sets the status to published is idempotent. One that adds one to a view count is not.",
      pauseAfter: 0.8,
    },

    // ── 3, 4. Status codes, and 401 against 403 ───────────────────────────
    {
      id: "codes",
      scene: true,
      text: "Question three. What do the HTTP status code classes mean? The first digit tells the story. Two hundreds succeed: two hundred OK, two oh one created, two oh four no content. Three hundreds redirect. Four hundreds blame the client, and five hundreds the server.",
      pauseAfter: 0.6,
    },
    {
      id: "codes-why",
      text: "The right code lets a client handle a failure in code, instead of parsing an error message.",
      pauseAfter: 1.6,
    },
    {
      id: "authn",
      text: "Question four. Four oh one versus four oh three, what is the difference?",
      pauseAfter: 0.4,
    },
    {
      id: "authn-401",
      text: "Four oh one, unauthorized, is really about authentication: the request has no valid credentials, and the response carries a challenge header saying how to authenticate.",
      pauseAfter: 0.6,
    },
    {
      id: "authn-403",
      text: "Four oh three, forbidden, means the server understood the request and refuses it. The credentials may be fine; they just aren't enough, and logging in again won't necessarily help.",
      pauseAfter: 0.6,
    },
    {
      id: "authn-404",
      text: "The follow-up: some APIs answer four oh four instead, on purpose, so a stranger can't learn that the resource exists.",
      pauseAfter: 0.8,
    },

    // ── 5. Idempotency ────────────────────────────────────────────────────
    {
      id: "idem",
      scene: true,
      text: "Question five. What is idempotency, and why does it matter for APIs? An idempotent operation has the same result whether it runs once or many times.",
      pauseAfter: 0.5,
    },
    {
      id: "idem-retry",
      text: "It matters because networks fail. A client that times out can't tell whether its request arrived, so it retries.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-run",
      text: "Here's a payment of fifty dollars, sent with POST, which HTTP doesn't make idempotent. The first attempt is charged but its response is lost, and the client retries twice. Three charges: a hundred and fifty dollars.",
      pauseAfter: 0.7,
    },
    {
      id: "idem-key",
      text: "The fix is an idempotency key: a unique ID the client generates once and sends with every attempt. The server stores it with the payment. Each retry finds the key, inserts nothing, and gets the original payment back. Three requests, one charge.",
      pauseAfter: 0.7,
    },
    {
      id: "idem-race",
      text: "What makes it safe is a unique constraint on the key: even two retries racing each other can't both get in, because the database refuses the second.",
      pauseAfter: 0.6,
    },
    {
      id: "idem-reply",
      text: "The server catches that refusal and answers with the stored payment, and a key reused with a different body is rejected.",
      pauseAfter: 0.8,
    },

    // ── 6. Pagination ─────────────────────────────────────────────────────
    {
      id: "page",
      scene: true,
      text: "Question six. How do you paginate a large collection? The simple way is offset and limit: skip forty, take twenty. It can jump to any page, but the database walks every row it skips.",
      pauseAfter: 0.5,
    },
    {
      id: "page-cost",
      text: "Run it in Postgres, the open-source relational database, on a hundred thousand articles, newest first. Page one reads twenty rows. Page five hundred reads ten thousand to return twenty, and page five thousand reads all hundred thousand.",
      pauseAfter: 0.7,
    },
    {
      id: "page-drift",
      text: "It can also repeat rows. A reader takes page one, a new article is published, and page two starts with the article page one ended on.",
      pauseAfter: 0.6,
    },
    {
      id: "page-cursor",
      text: "Cursor pagination hands back an opaque cursor marking where the page stopped, here the last article's ID. The next request asks for what comes after it: twenty rows read at any depth, and nothing shifts when articles arrive.",
      pauseAfter: 0.6,
    },
    {
      id: "page-cost-two",
      text: "It costs two things: no jumping straight to page five hundred, and an order that's unique and never changes, so a sort by time adds the ID as a tiebreaker.",
      pauseAfter: 0.6,
    },
    {
      id: "page-index",
      text: "And that order needs an index to match, or every page scans the whole table.",
      pauseAfter: 0.8,
    },

    // ── 7, 8. Sessions, JWT and OAuth ─────────────────────────────────────
    {
      id: "auth",
      scene: true,
      text: "Question seven. Sessions versus JWT versus OAuth, how do they relate? They answer different questions.",
      pauseAfter: 0.5,
    },
    {
      id: "auth-session",
      text: "With a session, the server stores the login and hands the client an opaque ID, usually in a cookie: forty-three random characters that mean nothing without the server's store.",
      pauseAfter: 0.6,
    },
    {
      id: "auth-jwt",
      text: "JWT, a JSON Web Token, is a signed format for claims. This one is a hundred sixty-four characters, and anyone can read it: decode the middle part, and there's the user, the role, and the expiry. The signature proves who issued it: change the role to admin, and it no longer verifies.",
      pauseAfter: 0.6,
    },
    {
      id: "auth-oauth",
      text: "OAuth isn't a token format at all. It's a framework for delegated authorization: letting one app reach your data on another service without your password. Its access tokens may be JWTs or opaque strings.",
      pauseAfter: 0.6,
    },
    {
      id: "auth-oidc",
      text: "Logging users in on top of OAuth is OpenID Connect's job: it adds an ID token.",
      pauseAfter: 0.7,
    },
    {
      id: "revoke",
      text: "Question eight. When would you choose stateful sessions over stateless JWTs?",
      pauseAfter: 0.4,
    },
    {
      id: "revoke-session",
      text: "When you need instant revocation, to log a user out or ban them now, and can afford a session store every server shares. Delete the session, and the next request fails. Checked locally, a JWT stays valid until it expires, unless every check does a lookup again.",
      pauseAfter: 0.6,
    },
    {
      id: "revoke-jwt",
      text: "JWTs fit many services verifying requests without asking a session store each time.",
      pauseAfter: 0.6,
    },
    {
      id: "revoke-hybrid",
      text: "The common hybrid pairs a short-lived access token, say fifteen minutes, with a longer-lived refresh token that can be revoked. A banned user then keeps access for at most those fifteen minutes.",
      pauseAfter: 0.8,
    },

    // ── 9. Rate limits, from the client's side ────────────────────────────
    {
      id: "limit",
      scene: true,
      text: "Question nine. How do you rate-limit an API, and how should clients learn their limits? The server caps requests per client per window, commonly with a token bucket, which allows short bursts. Part two, on scaling, covers how it counts.",
      pauseAfter: 0.5,
    },
    {
      id: "limit-contract",
      text: "The client's half is a contract in the response. Over the limit, the answer is four twenty-nine, too many requests. Headers carry the rest: the limit, what's remaining, when the window resets, and Retry-After, how long to wait.",
      pauseAfter: 0.6,
    },
    {
      id: "limit-client",
      text: "A well-behaved client watches what's remaining, and slows down before it's refused. On a four twenty-nine, it waits at least Retry-After. Refused again, it doubles the wait each time, plus random jitter, so a crowd of clients doesn't return at once.",
      pauseAfter: 0.6,
    },
    {
      id: "limit-safe",
      text: "The same backoff serves timeouts and server errors, but there the client can't know what happened, so it repeats only what's safe: a GET, a PUT, or a POST with an idempotency key.",
      pauseAfter: 0.8,
    },

    // ── 10. REST, GraphQL or gRPC ─────────────────────────────────────────
    {
      id: "styles",
      scene: true,
      text: "Question ten. REST versus GraphQL versus gRPC, when does each fit?",
      pauseAfter: 0.4,
    },
    {
      id: "styles-rest",
      text: "REST is resources over HTTP and JSON: universally understood, easy to cache, the safe default for a public API. But a screen that needs an article, its author and its comments may make three round trips, and get fields it never shows.",
      pauseAfter: 0.6,
    },
    {
      id: "styles-graphql",
      text: "GraphQL lets the client ask for exactly the fields it wants, in one query, which suits rich, varied front ends. But caching and rate limiting get harder, and one query can be expensive, so a limit has to weigh what a query costs.",
      pauseAfter: 0.6,
    },
    {
      id: "styles-grpc",
      text: "gRPC sends binary Protocol Buffers over HTTP two: fast, strongly typed, and able to stream. It's ideal between internal services, with weaker browser support, and messages that aren't human-readable.",
      pauseAfter: 0.6,
    },
    {
      id: "styles-mix",
      text: "So a common design uses REST for the public API and gRPC between its own services.",
      pauseAfter: 0.8,
    },

    // ── Quick ─────────────────────────────────────────────────────────────
    {
      id: "rapid-in",
      scene: true,
      text: "Six more, a sentence or two each.",
      pauseAfter: 0.5,
    },
    {
      id: "r-naming",
      text: "Name resources with plural nouns for collections and IDs for members: articles, article forty-two, its comments beneath it. No verbs in paths: the method is the verb. An action like publish becomes a state change: patch the status to published.",
      pauseAfter: 0.6,
    },
    {
      id: "r-blog",
      text: "So the blog is two collections: GET and POST on articles, GET, PATCH and DELETE on one article, GET and POST on its comments. Filters go in the query string, and a create answers two oh one, with a Location header pointing at the new article.",
      pauseAfter: 0.6,
    },
    {
      id: "r-version",
      text: "Version an API to protect clients from breaking changes, like removing a field or changing its type.",
    },
    {
      id: "r-version-path",
      text: "A version in the path, slash v one, is the pragmatic default: more visible and cache-friendly than a header or a query parameter.",
    },
    {
      id: "r-version-add",
      text: "Adding an optional field needs no new version.",
      pauseAfter: 0.6,
    },
    {
      id: "r-errors",
      text: "Errors get the right status code and a consistent body: a stable code a client can branch on, a message for a person, and details per field. Never a stack trace.",
      pauseAfter: 0.6,
    },
    {
      id: "r-hateoas",
      text: "HATEOAS, hypermedia as the engine of application state, means responses carry links to what the client can do next. REST as first defined requires it; in practice most APIs skip it, though a link to the next page is common.",
      pauseAfter: 0.6,
    },
    {
      id: "r-content",
      text: "Content negotiation lets one URL serve several representations: Accept says what the client can take, and Content-Type what it got. Encoding works the same way: ask for gzip, and this page of twenty articles arrives at about a sixth of its size.",
      pauseAfter: 0.9,
    },
    {
      id: "next",
      text: "Behind every one of these endpoints, the data has to live somewhere. Next: databases.",
    },
  ],
};
