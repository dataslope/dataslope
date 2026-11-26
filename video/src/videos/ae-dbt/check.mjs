// Computes or runs every fact the ae-dbt video shows, and writes it to
// results.json, which data.ts reads. From the repo root:
//
//   node video/src/videos/ae-dbt/check.mjs
//
// dbt does not run here, so nothing below is presented as dbt's output. Two
// kinds of fact:
//
//   - The graph. The page's lineage slice (content/interview/analytics-engineer/
//     dbt.mdx, "What is the dbt lineage DAG, and how is it built?", its mermaid
//     block) is read out of the page at run time, with the page's one exposure
//     ("What are exposures in dbt?": weekly_revenue_dashboard depends on
//     fct_orders and dim_customer). From those edges this file works out what
//     the page says dbt uses the graph for: the order the four models build in
//     and which can build side by side, and what the page's `+` selectors pick
//     (upstream with a leading `+`, downstream with a trailing one, as the
//     page's "The `+` operator selects upstream or downstream nodes"). That is
//     arithmetic on the page's graph, and script.ts says so.
//
//   - The materializations. A view and a table are what the warehouse is
//     asked to create around a model's SELECT, so they run here, on the site's
//     Postgres (PGlite, PostgreSQL 18, through video/scripts/lib/pg-figure.mjs,
//     the engine the track's runnable SQL runs on). The model is the
//     warehousing page's own: its "What is an idempotent rebuild" block builds
//     dim_customer from customer_events (24 events, 12 customers), read out of
//     the page at run time. Each is created, read under EXPLAIN ANALYZE (costs,
//     timings and buffers off, so two runs write the same file), and read
//     again after one new event lands: the video's own customer 13.
//
// Also run, for the rapid round: the page's cents_to_dollars macro, expanded
// by hand into the expression the page says it emits, on the video's own
// 1999 cents, beside the same division without its ".0".
//
// The script fails if the page stops saying what the narration quotes.
/* global console */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { figure } from "../../../scripts/lib/pg-figure.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../../../..");
const page = (name) => readFileSync(join(root, "content/interview/analytics-engineer", `${name}.mdx`), "utf8");

const check = (ok, what) => {
  if (!ok) throw new Error(`ae-dbt check failed: ${what}`);
};

/** The section of a page under one `### ` heading, up to the next. */
function section(name, heading) {
  const text = page(name);
  const at = text.indexOf(`### ${heading}`);
  check(at >= 0, `${name}.mdx has no heading "${heading}"`);
  const next = text.indexOf("\n### ", at + 4);
  return text.slice(at, next < 0 ? undefined : next);
}

/** A fenced block of the given language inside a section, verbatim. */
function fence(sectionText, lang, nth = 0) {
  const all = [...sectionText.matchAll(new RegExp("```" + lang + "\\n([\\s\\S]*?)```", "g"))];
  check(all[nth], `no ${lang} fence #${nth} in the section`);
  return all[nth][1].trimEnd();
}

/** A template-literal prop (initSql={`...`}) inside a section, verbatim. */
function prop(sectionText, name) {
  const open = sectionText.indexOf(`${name}={\``);
  check(open >= 0, `no ${name} in the section`);
  const start = open + name.length + 3;
  return sectionText.slice(start, sectionText.indexOf("`}", start));
}

// ── The graph: the page's lineage slice and its exposure ────────────────────

const DAG_SECTION = section("dbt", "What is the dbt lineage DAG, and how is it built?");
const MERMAID = fence(DAG_SECTION, "mermaid");
/** Node id -> its label's name, and whether it is a source. */
const nodes = {};
const edges = [];
for (const line of MERMAID.split("\n").slice(1)) {
  const parts = line.trim().split("-->").map((p) => p.trim());
  if (parts.length !== 2) continue;
  const ids = parts.map((p) => {
    const m = p.match(/^(\w+)(?:\["(.*)"\])?$/);
    check(m, `mermaid node ${p}`);
    const [, id, label] = m;
    if (label) {
      const name = label.replace(/<\/?code>/g, "").replace(/^source: /, "");
      nodes[id] = { name, kind: label.startsWith("source:") ? "source" : "model" };
    }
    return id;
  });
  edges.push(ids);
}
const named = edges.map(([a, b]) => [nodes[a].name, nodes[b].name]);
check(
  JSON.stringify(named) ===
    JSON.stringify([
      ["raw.orders", "stg_orders"],
      ["raw.customers", "stg_customers"],
      ["stg_orders", "fct_orders"],
      ["stg_customers", "dim_customer"],
      ["dim_customer", "fct_orders"],
    ]),
  `the page's lineage slice changed: ${JSON.stringify(named)}`,
);

const EXPOSURE_SECTION = section("dbt", "What are exposures in dbt?");
const EXPOSURE_YAML = fence(EXPOSURE_SECTION, "yaml");
const exposureName = EXPOSURE_YAML.match(/- name: (\w+)/)[1];
const exposureRefs = [...EXPOSURE_YAML.matchAll(/ref\('(\w+)'\)/g)].map((m) => m[1]);
check(exposureName === "weekly_revenue_dashboard" && JSON.stringify(exposureRefs) === '["fct_orders","dim_customer"]', "the page's exposure");

const SOURCES = Object.values(nodes).filter((n) => n.kind === "source").map((n) => n.name);
const MODELS = Object.values(nodes).filter((n) => n.kind === "model").map((n) => n.name);
const allEdges = [...named, ...exposureRefs.map((r) => [r, exposureName])];
const parents = (n) => allEdges.filter(([, b]) => b === n).map(([a]) => a);
const children = (n) => allEdges.filter(([a]) => a === n).map(([, b]) => b);
const closure = (start, step) => {
  const seen = new Set();
  const walk = (n) => step(n).forEach((m) => !seen.has(m) && (seen.add(m), walk(m)));
  walk(start);
  return [...seen];
};

/** The build order: each model's step is one more than its latest parent's;
 *  models on the same step depend on nothing between them, so they can build
 *  side by side. Sources are read, not built. */
const step = {};
const stepOf = (n) => {
  if (SOURCES.includes(n)) return 0;
  if (step[n] === undefined) step[n] = 1 + Math.max(0, ...parents(n).map(stepOf));
  return step[n];
};
MODELS.forEach(stepOf);
const waves = [];
for (const m of MODELS) (waves[step[m] - 1] ??= []).push(m);

/** What a selector picks among the models, sources and exposure, models in
 *  build order. */
const order = (list) => [...waves.flat(), ...SOURCES, exposureName].filter((n) => list.includes(n));
const select = (sel) => {
  const name = sel.replace(/^\+|\+$/g, "");
  const picked = [name];
  if (sel.startsWith("+")) picked.push(...closure(name, parents));
  if (sel.endsWith("+")) picked.push(...closure(name, children));
  const all = order(picked);
  return {
    selector: sel,
    models: all.filter((n) => MODELS.includes(n)),
    sources: all.filter((n) => SOURCES.includes(n)),
    exposures: all.filter((n) => n === exposureName),
  };
};

const SUBSET_SECTION = section("dbt", "How do you run only a subset of models in dbt?");
const SELECTORS = fence(SUBSET_SECTION, "bash");
check(SELECTORS.includes("dbt run --select +fct_orders") && SELECTORS.includes("dbt run --select marts") && SELECTORS.includes("dbt run --select tag:nightly"), "the page's three selectors");

const graph = {
  sources: SOURCES,
  models: MODELS,
  exposure: { name: exposureName, dependsOn: exposureRefs },
  edges: allEdges,
  waves,
  // The page's own selector, and the trailing-plus selectors the page's
  // blast-radius chart writes as `dbt build --select the_model+`, one per
  // model: what a change to that model rebuilds, and whether it reaches the
  // dashboard.
  selections: ["+fct_orders", "+dim_customer", "stg_orders+", "stg_customers+", "dim_customer+", "fct_orders+"].map(select),
  selectorsListing: SELECTORS,
};

check(JSON.stringify(waves) === '[["stg_orders","stg_customers"],["dim_customer"],["fct_orders"]]', `build waves ${JSON.stringify(waves)}`);
const sel = (s) => graph.selections.find((x) => x.selector === s);
check(sel("+fct_orders").models.length === 4, "+fct_orders picks all four models");
check(JSON.stringify(sel("stg_customers+").models) === '["stg_customers","dim_customer","fct_orders"]', "stg_customers+ picks three models");
check(sel("stg_customers+").exposures.length === 1 && sel("fct_orders+").models.length === 1 && sel("fct_orders+").exposures.length === 1, "fct_orders+ picks itself and the dashboard");

// ── The materializations, on the warehousing page's dim_customer ────────────

const REBUILD = section("data-warehousing", "What is an idempotent rebuild, and why does it matter?");
const EVENTS_LOG = prop(REBUILD, "initSql");
const MODEL_SQL = prop(REBUILD, "starterCode").match(/(SELECT customer_id, MAX\(updated_at\) AS updated_at\nFROM customer_events\nGROUP BY customer_id)/)[1];

const EXPLAIN = "EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, BUFFERS OFF, SUMMARY OFF)";
const READ = "SELECT * FROM dim_customer";
const COUNT = "SELECT COUNT(*) AS customers FROM dim_customer";
const NEW_EVENT = "INSERT INTO customer_events\nVALUES (13, TIMESTAMP '2024-05-02 00:00:00')";

const materialize = (kind) =>
  figure(`${EVENTS_LOG};`, {
    events: "SELECT COUNT(*) AS events, COUNT(DISTINCT customer_id) AS customers FROM customer_events",
    create: `CREATE ${kind} dim_customer AS\n${MODEL_SQL}`,
    plan: `${EXPLAIN}\n${READ}`,
    count: COUNT,
    arrive: NEW_EVENT,
    countAfter: COUNT,
    planAfter: `${EXPLAIN}\n${READ}`,
  });

const materializations = { view: await materialize("VIEW"), table: await materialize("TABLE") };
// The table, rebuilt by the next run: the same statement, from scratch.
materializations.tableRebuilt = await figure(`${EVENTS_LOG};\n${NEW_EVENT};`, {
  create: `CREATE TABLE dim_customer AS\n${MODEL_SQL}`,
  count: COUNT,
  // Its plan after the rebuild, so the screen's plan moves with its count.
  plan: `${EXPLAIN}\n${READ}`,
});

// ── The macro, for the rapid round ──────────────────────────────────────────

const MACRO_SECTION = section("dbt", "How do macros work in dbt?");
const MACRO = fence(MACRO_SECTION, "sql");
check(MACRO.includes("({{ column_name }} / 100.0)") && MACRO.includes("cents_to_dollars('amount_cents')"), "the page's macro");
const macro = await figure("CREATE TABLE orders (order_id INTEGER, amount_cents INTEGER);\nINSERT INTO orders VALUES (1, 1999);", {
  // What {{ cents_to_dollars('amount_cents') }} expands to, as the page
  // writes the macro, rounded only for printing.
  expanded: "SELECT (amount_cents / 100.0)::numeric(10, 2) AS amount_usd FROM orders",
  // The same division with an integer hundred, typed by hand in a model.
  integer: "SELECT amount_cents / 100 AS amount_usd FROM orders",
});

// ── What the narration says, held to what ran ───────────────────────────────

const stepOk = (fig, id) => {
  const s = fig.steps[id];
  check(s?.ok, `${id} failed: ${s?.error}`);
  return s;
};
const planText = (fig, id) => stepOk(fig, id).rows.map((r) => r[0]);
const v = materializations.view;
const t = materializations.table;
check(stepOk(v, "events").rows[0].map(Number).join() === "24,12", "the page's log: 24 events, 12 customers");
check(planText(v, "plan").some((l) => /Seq Scan on customer_events \(actual rows=24/.test(l)) && planText(v, "plan").some((l) => /HashAggregate \(actual rows=12/.test(l)), "the view groups 24 events into 12 on every read");
check(planText(t, "plan").length === 1 && /Seq Scan on dim_customer \(actual rows=12/.test(planText(t, "plan")[0]), "the table reads 12 stored rows");
check(Number(stepOk(v, "countAfter").rows[0][0]) === 13 && Number(stepOk(t, "countAfter").rows[0][0]) === 12, "after the new event: view 13, table 12");
check(Number(stepOk(materializations.tableRebuilt, "count").rows[0][0]) === 13, "the rebuilt table: 13");
check(planText(materializations.tableRebuilt, "plan").length === 1 && /Seq Scan on dim_customer \(actual rows=13/.test(planText(materializations.tableRebuilt, "plan")[0]), "the rebuilt table reads 13 stored rows");
check(stepOk(macro, "expanded").rows[0][0] === "19.99" && Number(stepOk(macro, "integer").rows[0][0]) === 19, "the macro: 19.99; integer division: 19");

const quoted = [
  ["dbt", "it doesn't\nmove data (that's EL tools)"],
  ["dbt", "Hardcoding table\nnames breaks lineage and environment handling."],
  ["dbt", "parallelize independent branches"],
  ["dbt", "it runs the model, then immediately tests it before moving to downstream nodes"],
  ["dbt", "the CTE is duplicated each time"],
  ["dbt", "`dbt_alice_staging`"],
  ["dbt", "The default behavior uses the `target.schema` from the profile plus any model-level schema override."],
  ["dbt", "`ref()` automatically resolves to the correct schema for the active target"],
  ["dbt", "A **profile** groups targets, typically `dev`"],
  ["dbt", "the hosted dbt platform configures the same split as **environments**"],
  ["dbt", "Configurations cascade: project-level defaults are overridden by directory-level, then model-level `config()` blocks."],
  ["dbt", "ref('model_name', version=1)"],
  ["dimensional-modeling", "**Staging**, one model per source table; light cleaning/renaming/typing, no business logic."],
  ["data-warehousing", "Choose by read frequency, compute cost, and data volume, not habit."],
];
for (const [name, text] of quoted) check(page(name).includes(text), `${name}.mdx no longer says ${JSON.stringify(text.slice(0, 50))}`);

// Question 20, dbt v2 (added to the page on 2026-11-20): its answer's
// sentences, compared with line breaks folded to spaces, and the three facts
// the screen prints, read out of the page so a later edit fails here first.
const flat = (text) => text.replace(/\s+/g, " ");
const V2_SECTION = flat(section("dbt", "What is dbt v2, and how does it relate to dbt Core?"));
const v2Quoted = [
  'dbt v2 is a rewrite of the engine in Rust, first shipped as the "Fusion engine" and generally available since September 2026.',
  "The main distribution is now called just **dbt** and ships under dbt's own product license.",
  "**dbt OSS** is the subset built entirely from Apache 2.0 code.",
  "**dbt Core** names only the Python 1.x line, which is still supported and ends at 1.13.",
  "so a misspelled column is caught at compile time rather than by the warehouse.",
  "Every deprecation warning a 1.x project prints has to be resolved before it will run, which in practice means `data_tests:`",
];
for (const text of v2Quoted) check(V2_SECTION.includes(text), `dbt.mdx's dbt v2 answer no longer says ${JSON.stringify(text.slice(0, 50))}`);
const dbtV2 = {
  language: V2_SECTION.match(/a rewrite of the engine in (\w+)/)[1],
  /** The name it first shipped under: "Fusion", of the "Fusion engine". */
  engineName: V2_SECTION.match(/first shipped as the "(\w+) engine"/)[1],
  generallyAvailable: V2_SECTION.match(/generally available since (\w+ \d{4})/)[1],
  coreLine: V2_SECTION.match(/names only the Python ([\d.x]+) line/)[1],
  coreEndsAt: V2_SECTION.match(/still supported and ends at ([\d.]+)\./)[1],
  /** The licence of dbt OSS, the subset of the new distribution the page
   *  sets against dbt's own product license: "Apache 2.0". */
  ossLicense: V2_SECTION.match(/\*\*dbt OSS\*\* is the subset built entirely from (Apache [\d.]+) code/)[1],
  /** The page's first example of a 1.x deprecation v2 refuses: `tests:`
   *  (its generic-tests block, before the review) now `data_tests:`. */
  testsKey: V2_SECTION.match(/means `(data_tests):`/)[1],
};

// The page's listings the video puts on screen, read verbatim, so the screen
// and the page cannot drift apart.
const REF_SECTION = section("dbt", "What do `ref()` and `source()` do?");
const listings = {
  fctOrders: fence(REF_SECTION, "sql", 0),
  sourceLine: fence(REF_SECTION, "sql", 1),
  ephemeral: fence(section("dbt", "What is an ephemeral model, and when should you use it?"), "sql"),
  macro: MACRO,
  packages: fence(section("dbt", "What are dbt packages, and how do you add one?"), "yaml"),
  varsModel: fence(section("dbt", "How do you pass variables into dbt models?"), "sql"),
  varsCli: fence(section("dbt", "How do you pass variables into dbt models?"), "bash"),
  exposure: EXPOSURE_YAML,
  selectors: SELECTORS,
};
check(listings.fctOrders.includes("FROM {{ ref('stg_orders') }}") && listings.sourceLine.includes("{{ source('raw', 'orders') }}"), "the page's ref and source lines");
check(listings.ephemeral.includes("materialized='ephemeral'"), "the page's ephemeral model");

const results = {
  graph,
  dbtV2,
  materializations,
  macro,
  listings,
  modelSql: MODEL_SQL,
  postgres: [...new Set([v, t, macro].map((f) => f.version))],
};
writeFileSync(join(here, "results.json"), `${JSON.stringify(results, null, 2)}\n`);
console.log(`ae-dbt: graph of ${MODELS.length} models, waves ${JSON.stringify(waves)}; materializations on ${results.postgres.join(", ")}; every check passed.`);
