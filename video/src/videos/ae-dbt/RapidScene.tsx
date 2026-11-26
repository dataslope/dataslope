import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { RapidFire, type RapidItem, Tick } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT_INK, INK, INK_SOFT, note } from "../../editorial/style";
import { NextLine, Note, Num } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { DBT_V2, GRAPH, LISTING, MACRO } from "./data";
import {
  Arrow,
  artBox,
  BOX_H,
  Code,
  DASH_W,
  Drift,
  edgeKey,
  Graph,
  type GEdge,
  type GNode,
  Headline,
  Kicker,
  Line,
  Listing,
  listingHeight,
  lineOf,
  listingWidth,
  Mark,
  MARK_GREEN,
  MARK_RED,
  MODEL_W,
  OK_INK,
  sliceLayout,
  SLICE_EDGE,
  Spot,
  VRule,
  X0,
} from "./parts";

const R_X = 1000;
const LIST_TOP = 290;
const ROW = 50;
const SIZE = 19;

type Ctx = { w: (beat: string, phrase: string) => number; y: Layout["y"]; h: Layout["h"] };

/** The key fact of an answer: the first line of every body, in ink. */
const Fact: React.FC<{ at: number; c: Ctx; dy?: number; children: React.ReactNode }> = ({ at, c, dy = 0, children }) => (
  <Line at={at} x={R_X} y={c.y(LIST_TOP) + c.h(dy)} size={26} weight={600}>
    {children}
  </Line>
);

// ── 11. Seeds ───────────────────────────────────────────────────────────────

const Seeds: React.FC<{ c: Ctx }> = ({ c }) => {
  const csvAt = c.w("r-seeds", "CSV files kept in the repository");
  const loadedAt = c.w("r-seeds", "loaded as tables by dbt seed");
  const refAt = c.w("r-seeds", "small reference data");
  const codesAt = c.w("r-seeds", "like country codes");
  const largeAt = c.w("r-seeds", "Nothing large");
  const top = c.y(LIST_TOP) + c.h(80);
  const mid = top + BOX_H / 2;
  const nodes: GNode[] = [
    { id: "csv", title: "country_codes.csv", slot: { x: R_X, cy: mid, w: 262 }, at: csvAt + 4, base: "soft" },
    { id: "table", title: "country_codes", slot: { x: R_X + 520, cy: mid, w: 206 }, at: loadedAt + 10 },
  ];
  return (
    <>
      <Fact at={csvAt} c={c}>
        CSV files in the repository, loaded as tables
      </Fact>
      <Graph nodes={nodes} edges={[{ from: "csv", to: "table", at: loadedAt + 2, dur: 16 }]} />
      <Line at={loadedAt + 4} x={R_X + 300} y={mid - c.h(48)} color={INK}>
        <Code>dbt seed</Code>
      </Line>
      <Line at={refAt} x={R_X} y={top + c.h(96)}>
        Small reference data with no source system<span style={{ opacity: ease(useCurrentFrame(), codesAt, 10) }}>: country codes</span>
      </Line>
      <Line at={largeAt} x={R_X} y={top + c.h(136)} color={INK_SOFT}>
        Nothing large, nothing that changes often
      </Line>
    </>
  );
};

// ── 12. Macros ──────────────────────────────────────────────────────────────

const Macros: React.FC<{ c: Ctx }> = ({ c }) => {
  const jinjaAt = c.w("r-macros", "A macro is a reusable Jinja function");
  const emitsAt = c.w("r-macros", "emits amount cents over a hundred point oh");
  const calledAt = c.w("r-macros", "wherever it's called");
  const onceAt = c.w("r-macros", "Written once");
  const handAt = c.w("r-macros", "Typed by hand over a plain hundred");
  const intAt = c.w("r-macros", "Postgres divides integers");
  const lines = LISTING.macro;
  const top = c.y(LIST_TOP) + c.h(56);
  const resY = top + listingHeight(lines.length, SIZE) + c.h(36);
  const COL2 = R_X + 420;
  /** The expression each way, as Postgres ran it on the video's 1999 cents. */
  const viaMacro = MACRO.expandedSql[0].replace(/^SELECT /, "").replace(/::numeric\(10, 2\)/, "").replace(/ AS amount_usd FROM orders$/, "");
  const byHand = MACRO.integerSql[0].replace(/^SELECT /, "").replace(/ AS amount_usd FROM orders$/, "");
  return (
    <>
      {/* In as the answer starts, so the page does not hold still for 3 s
          while the question is read (check:motion). */}
      <Fact at={jinjaAt - 24} c={c}>
        A reusable Jinja function that writes SQL
      </Fact>
      <Listing
        lines={lines}
        x={R_X}
        top={top}
        width={listingWidth(lines, SIZE)}
        size={SIZE}
        at={jinjaAt + 2}
        marks={[
          { line: "/ 100.0", text: "({{ column_name }} / 100.0)", at: emitsAt + 4 },
          { line: "-- SELECT", text: "{{ cents_to_dollars('amount_cents') }}", at: calledAt },
        ]}
      />
      <Line at={onceAt} x={R_X} y={resY} size={22}>
        On 1999 cents, in Postgres
      </Line>
      <Line at={onceAt + 2} x={R_X} y={resY + c.h(40)} size={22} color={INK_SOFT}>
        <Code>{viaMacro}</Code>, the macro
      </Line>
      <Line at={onceAt + 6} x={R_X} y={resY + c.h(78)} size={36} weight={600} color={OK_INK}>
        <Mark at={onceAt + 12} color={MARK_GREEN}>
          <Num>{MACRO.expanded}</Num>
        </Mark>
      </Line>
      <VRule x={COL2 - 30} top={resY + c.h(40)} bottom={resY + c.h(128)} at={handAt} />
      <Line at={handAt} x={COL2} y={resY + c.h(40)} size={22} color={INK_SOFT}>
        <Code>{byHand}</Code>, by hand
      </Line>
      {/* The result arrives as the division is named, so its label never
          stands beside an empty slot, and it holds through "nineteen
          dollars" and the pause after. */}
      <Line at={intAt + 4} x={COL2} y={resY + c.h(78)} size={36} weight={600} color={ACCENT_INK}>
        <Mark at={intAt + 10} color={MARK_RED}>
          <Num>{MACRO.integer}</Num>
        </Mark>
      </Line>
      <Line at={intAt + 10} x={COL2 + 100} y={resY + c.h(90)} color={ACCENT_INK}>
        Integer division
      </Line>
    </>
  );
};

// ── 13. Packages ────────────────────────────────────────────────────────────

const Packages: React.FC<{ c: Ctx }> = ({ c }) => {
  const sharedAt = c.w("r-packages", "Shared dbt projects");
  const listAt = c.w("r-packages", "List one in packages dot YAML");
  const pinnedAt = c.w("r-packages", "pinned to a version");
  const depsAt = c.w("r-packages", "run dbt deps");
  const utilsAt = c.w("r-packages", "The most common is dbt utils");
  const lines = LISTING.packages;
  const top = c.y(LIST_TOP) + c.h(96);
  const depsY = top + listingHeight(lines.length, SIZE) + c.h(36);
  const parcel = artBox("parcel", 200);
  return (
    <>
      <Fact at={sharedAt} c={c}>
        Shared dbt projects
      </Fact>
      <Line at={sharedAt + 6} x={R_X} y={c.y(LIST_TOP) + c.h(42)} color={INK_SOFT}>
        Macros, models and tests
      </Line>
      <Listing
        lines={lines}
        x={R_X}
        top={top}
        width={listingWidth(lines, SIZE) + 20}
        size={SIZE}
        at={listAt}
        marks={[
          { line: "version:", text: lines[lineOf(lines, "version:")].split("version: ")[1], at: pinnedAt + 2 },
          { line: "package:", text: "dbt-labs/dbt_utils", at: utilsAt + 2 },
        ]}
      />
      <Listing lines={["dbt deps"]} x={R_X} top={depsY} width={listingWidth(["dbt deps"], SIZE) + 20} size={SIZE} at={depsAt} />
      <Line at={depsAt + 6} x={R_X + 160} y={depsY + 6} color={INK_SOFT}>
        Installs it
      </Line>
      <Spot id="parcel" at={sharedAt + 4} left={1560} top={c.y(LIST_TOP) + c.h(90)} {...parcel} />
    </>
  );
};

// ── 14. Variables ───────────────────────────────────────────────────────────

const Vars: React.FC<{ c: Ctx }> = ({ c }) => {
  const readAt = c.w("r-vars", "Read one with var in the model");
  const defaultAt = c.w("r-vars", "give it a default in the project file");
  const overrideAt = c.w("r-vars", "override it on the command line");
  const jsonAt = c.w("r-vars", "as JSON");
  const model = LISTING.varsModel;
  const cli = LISTING.varsCli;
  const top = c.y(LIST_TOP) + c.h(56);
  const defY = top + listingHeight(model.length, SIZE) + c.h(30);
  const cliTop = defY + c.h(56);
  return (
    <>
      <Fact at={readAt} c={c}>
        <Code>var()</Code> in the model, overridden at run time
      </Fact>
      <Listing lines={model} x={R_X} top={top} width={listingWidth(model, SIZE)} size={SIZE} at={readAt + 4} marks={[{ line: "var(", text: `var("start_date")`, at: readAt + 10 }]} />
      <Line at={defaultAt} x={R_X} y={defY} size={22}>
        A default: <Code>vars:</Code> in <Code>dbt_project.yml</Code>
      </Line>
      <Listing lines={cli} x={R_X} top={cliTop} width={listingWidth(cli, SIZE)} size={SIZE} at={overrideAt} marks={[{ line: "--vars", text: `'{"start_date": "2024-01-01"}'`, at: jsonAt }]} />
    </>
  );
};

// ── 15. Exposures ───────────────────────────────────────────────────────────

const Exposures: React.FC<{ c: Ctx }> = ({ c }) => {
  const yamlAt = c.w("r-exposures", "YAML entries for what reads your models");
  const dashAt = c.w("r-exposures", "a dashboard");
  const mlAt = c.w("r-exposures", "a machine learning model");
  const etlAt = c.w("r-exposures", "a reverse ETL sync");
  const sitAt = c.w("r-exposures", "They sit in the lineage graph");
  const reachedAt = c.w("r-exposures", "reached the revenue dashboard");
  // The path lights from "question four's change", so it is whole by
  // "reached" and holds about 3.5 s, not the 1.5 s it had lit on "reached".
  const changeAt = c.w("r-exposures", "question four's change");
  const frame = useCurrentFrame();
  const lines = LISTING.exposure;
  const top = c.y(LIST_TOP) + c.h(92);
  const gTop = top + listingHeight(lines.length, SIZE) + c.h(46);
  const dash = artBox("dashboard", 200);
  const deps = GRAPH.exposure.dependsOn;
  const slots = {
    fct_orders: { x: R_X, cy: gTop + BOX_H / 2, w: MODEL_W },
    dim_customer: { x: R_X, cy: gTop + BOX_H / 2 + c.h(74), w: MODEL_W },
    dashboard: { x: R_X + 380, cy: gTop + BOX_H / 2 + c.h(37), w: DASH_W },
  };
  const nodes: GNode[] = [
    { id: "fct_orders", slot: slots.fct_orders, at: sitAt, tones: [{ at: reachedAt, tone: "lit" }] },
    { id: "dim_customer", slot: slots.dim_customer, at: sitAt + 3, tones: [{ at: reachedAt, tone: "lit" }] },
    { id: "dashboard", slot: slots.dashboard, at: sitAt + 6, exposure: true, title: "Revenue Dashboard", tones: [{ at: changeAt, tone: "lit" }] },
  ];
  const edges: GEdge[] = deps.map((d, i) => ({
    from: d,
    to: "dashboard",
    at: sitAt + 8 + i * 4,
    toPort: { side: "left", d: i === 0 ? -12 : 12 },
    tones: [{ at: changeAt + 6, color: "var(--ds-yellow-600)" }],
  }));
  return (
    <>
      <Fact at={yamlAt} c={c}>
        YAML for what reads your models
      </Fact>
      <Line at={dashAt} x={R_X} y={c.y(LIST_TOP) + c.h(42)} color={INK_SOFT}>
        A dashboard<span style={{ opacity: ease(frame, mlAt, 10) }}>, a machine learning model</span>
        <span style={{ opacity: ease(frame, etlAt, 10) }}>, a reverse ETL sync</span>
      </Line>
      <Listing
        lines={lines}
        x={R_X}
        top={top}
        width={listingWidth(lines, SIZE) + 20}
        size={SIZE}
        at={dashAt + 4}
        marks={[
          { line: "type:", text: "dashboard", at: dashAt + 12 },
          { line: "ref('fct_orders')", text: "ref('fct_orders')", at: sitAt + 2 },
          { line: "ref('dim_customer')", text: "ref('dim_customer')", at: sitAt + 6 },
        ]}
      />
      <Graph nodes={nodes} edges={edges} />
      <Spot id="dashboard" at={dashAt} left={1560} top={c.y(LIST_TOP) + c.h(110)} {...dash} />
    </>
  );
};

// ── 16. Docs ────────────────────────────────────────────────────────────────

const Docs: React.FC<{ c: Ctx }> = ({ c }) => {
  const genAt = c.w("r-docs", "dbt docs generate builds a site");
  const descAt = c.w("r-docs", "from the descriptions in YAML");
  const blocksAt = c.w("r-docs", "markdown doc blocks");
  const serveAt = c.w("r-docs", "dbt docs serve opens it");
  const graphAt = c.w("r-docs", "an interactive graph");
  const frame = useCurrentFrame();
  const cmds = ["dbt docs generate", "dbt docs serve"];
  const top = c.y(LIST_TOP) + c.h(56);
  const descY = top + listingHeight(2, SIZE) + c.h(30);
  const gTop = descY + c.h(96);
  const row = c.h(52);
  const lay = sliceLayout({ left: R_X, top: gTop, pitch: 270, row, w: 190, sources: false });
  const ids = ["stg_orders", "stg_customers", "dim_customer", "fct_orders"] as const;
  const nodes: GNode[] = ids.map((id, i) => ({ id, slot: lay[id], at: graphAt + i * 2, size: 20, h: 44 }));
  const edges: GEdge[] = GRAPH.edges
    .filter(([a, b]) => (ids as readonly string[]).includes(a) && (ids as readonly string[]).includes(b))
    // Whole by "the same ref and source calls", so it is up for about 3.5 s
    // before Question 17 rather than 1.5.
    .map(([a, b], i) => ({ from: a, to: b, at: graphAt + 8 + i * 4, ...SLICE_EDGE[edgeKey(a, b)] }));
  return (
    <>
      <Fact at={genAt} c={c}>
        A documentation site, with the lineage graph
      </Fact>
      <Listing
        lines={cmds}
        x={R_X}
        top={top}
        width={listingWidth(cmds, SIZE) + 20}
        size={SIZE}
        at={genAt + 2}
        lineAt={[genAt + 6, serveAt]}
      />
      <Line at={genAt + 10} x={R_X + 300} y={top + c.h(8)} color={INK_SOFT}>
        Builds the site
      </Line>
      <Line at={serveAt + 4} x={R_X + 300} y={top + c.h(46)} color={INK_SOFT}>
        Opens it
      </Line>
      <Line at={descAt} x={R_X} y={descY}>
        From descriptions in YAML<span style={{ opacity: ease(frame, blocksAt, 10) }}> and markdown doc blocks</span>
      </Line>
      <Line at={graphAt} x={R_X} y={descY + c.h(40)} color={INK_SOFT}>
        A graph from the same <Code>ref</Code> and <Code>source</Code> calls
      </Line>
      <Graph nodes={nodes} edges={edges} />
    </>
  );
};

// ── 17. dbt_project.yml ─────────────────────────────────────────────────────

const Project: React.FC<{ c: Ctx }> = ({ c }) => {
  const rootAt = c.w("r-project", "The root configuration");
  const nameAt = c.w("r-project", "the project's name");
  const foldersAt = c.w("r-project", "its folders");
  const defaultsAt = c.w("r-project", "default configs by folder");
  const matAt = c.w("r-project", "such as a materialization");
  const folderAt = c.w("r-project", "A folder's setting overrides the project's");
  const modelAt = c.w("r-project", "a model's own config overrides both");
  const frame = useCurrentFrame();
  const top = c.y(LIST_TOP) + c.h(100);
  const STEP = c.h(96);
  const levels = [
    { id: "project", title: "The project\u2019s defaults", sub: <Code>dbt_project.yml</Code>, at: defaultsAt },
    { id: "folder", title: "A folder\u2019s setting", sub: <Code>models/marts/</Code>, at: folderAt },
    { id: "model", title: "A model\u2019s own config", sub: <Code>{"{{ config(...) }}"}</Code>, at: modelAt },
  ];
  const nodes: GNode[] = levels.map((l, i) => ({
    id: l.id,
    title: l.title,
    sans: true,
    slot: { x: R_X + i * 60, cy: top + i * STEP + BOX_H / 2, w: 330 },
    at: l.at,
    tones: i === 2 ? [{ at: modelAt + 8, tone: "lit" as const }] : [],
  }));
  return (
    <>
      <Fact at={rootAt} c={c}>
        The root configuration
      </Fact>
      <Line at={nameAt} x={R_X} y={c.y(LIST_TOP) + c.h(42)} color={INK_SOFT}>
        The project&rsquo;s name<span style={{ opacity: ease(frame, foldersAt, 10) }}>, its folders</span>
        <span style={{ opacity: ease(frame, defaultsAt, 10) }}>, default configs by folder</span>
        <span style={{ opacity: ease(frame, matAt, 10) }}>: a materialization</span>
      </Line>
      <Graph nodes={nodes} edges={[]} />
      {levels.map((l, i) => (
        <React.Fragment key={l.id}>
          <Line at={l.at + 4} x={R_X + i * 60 + 350} y={top + i * STEP + 12} color={INK_SOFT}>
            {l.sub}
          </Line>
          {i > 0 ? (
            <>
              <Arrow
                points={[
                  [R_X + (i - 1) * 60 + 30, top + (i - 1) * STEP + BOX_H + 6],
                  [R_X + (i - 1) * 60 + 30, top + i * STEP + BOX_H / 2],
                  [R_X + i * 60 - 8, top + i * STEP + BOX_H / 2],
                ]}
                at={l.at - 2}
              />
              <Line at={l.at + 6} x={R_X + (i - 1) * 60 + 44} y={top + (i - 1) * STEP + BOX_H + c.h(4)} size={20} color={INK_SOFT}>
                overridden by
              </Line>
            </>
          ) : null}
        </React.Fragment>
      ))}
    </>
  );
};

// ── 18. Versions ────────────────────────────────────────────────────────────

/** The model's own versions config, as an unpinned ref meets it. */
const LATEST = "latest_version: 1";

const Versions: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const sinceAt = c.w("r-version", "Since dbt one point five");
  const yamlAt = c.w("r-version", "declare versions in YAML");
  const fileAt = c.w("r-version", "each with its own SQL file");
  const pinAt = c.w("r-version", "Consumers pin one with ref and a version number");
  const breakAt = c.w("r-version", "a breaking change rolls out");
  const forcingAt = c.w("r-version", "without forcing everyone across at once");
  // What a ref with no version gets (dbt's documented default, not the
  // page's): the latest version, by default the highest, so every unpinned
  // consumer is on v2 at once unless latest_version is held back.
  const noneAt = c.w("r-version-latest", "A ref with no version");
  const latestAt = c.w("r-version-latest", "gets the latest version");
  const highestAt = c.w("r-version-latest", "defaults to the highest number");
  const setAt = c.w("r-version-latest", "set latest version to one");
  const movedAt = c.w("r-version-latest", "until consumers have moved");
  const top = c.y(LIST_TOP) + c.h(80);
  const v = [
    { id: "v1", file: "dim_customer_v1.sql", at: fileAt },
    { id: "v2", file: "dim_customer_v2.sql", at: fileAt + 8 },
  ];
  const vy = (i: number) => top + c.h(30) + i * c.h(76) + BOX_H / 2;
  const nodes: GNode[] = [
    { id: "dim_customer", slot: { x: R_X, cy: top + c.h(68) + BOX_H / 2, w: MODEL_W }, at: yamlAt },
    ...v.map((x, i) => ({
      id: x.id,
      title: x.file,
      slot: { x: R_X + 300, cy: vy(i), w: 290 },
      at: x.at,
      // The pinned one in yellow, as it is named; the new one stays in ink.
      tones: i === 0 ? [{ at: pinAt + 10, tone: "lit" as const }] : [],
    })),
  ];
  const edges: GEdge[] = v.map((x) => ({ from: "dim_customer", to: x.id, at: x.at - 4, toPort: { side: "left" }, turnX: R_X + 250 }));
  const pinY = vy(1) + c.h(92);
  const noneY = pinY + c.h(104);
  return (
    <>
      <Fact at={sinceAt} c={c}>
        Versions in YAML, since dbt 1.5
      </Fact>
      <Graph nodes={nodes} edges={edges} />
      <Line at={pinAt} x={R_X} y={pinY} size={22}>
        A consumer pins one: <Code>{"ref('dim_customer', version=1)"}</Code>
      </Line>
      <Line at={breakAt} x={R_X} y={pinY + c.h(44)} color={INK_SOFT}>
        Breaking changes go in v2<span style={{ opacity: ease(frame, forcingAt, 10) }}>; pinned consumers move when they choose to</span>
      </Line>
      <Line at={noneAt} x={R_X} y={noneY} size={22}>
        No version: <Code>{"ref('dim_customer')"}</Code>
        <span style={{ opacity: ease(frame, latestAt, 10) }}>
          {" "}→ <Code>latest_version</Code>
        </span>
      </Line>
      <Line at={highestAt} x={R_X} y={noneY + c.h(44)} color={ACCENT_INK} weight={600}>
        By default the highest: v2, for everyone at once
      </Line>
      <Line at={setAt} x={R_X} y={noneY + c.h(88)} color={OK_INK} weight={600}>
        <Code color={OK_INK}>{LATEST}</Code>
        <span style={{ opacity: ease(frame, movedAt, 10) }}> until consumers have moved</span>
      </Line>
    </>
  );
};

// ── 19. dbt debug ───────────────────────────────────────────────────────────

const Debug: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const checksAt = c.w("r-debug", "It checks your connection setup");
  const profilesAt = c.w("r-debug", "that the profiles file is valid");
  const reachAt = c.w("r-debug", "dbt can reach the warehouse");
  const runAt = c.w("r-debug", "Run it on a new environment");
  const errAt = c.w("r-debug", "on a connection error");
  const beforeAt = c.w("r-debug", "before you debug any model");
  const top = c.y(LIST_TOP) + c.h(64);
  const checksY = top + listingHeight(1, SIZE) + c.h(36);
  const plug = artBox("plug", 190);
  const checks = [
    { t: <><Code>profiles.yml</Code> is valid</>, at: profilesAt },
    { t: <>dbt can reach the warehouse</>, at: reachAt },
  ];
  return (
    <>
      <Fact at={checksAt} c={c}>
        Checks the connection, not the models
      </Fact>
      <Listing lines={["dbt debug"]} x={R_X} top={top} width={listingWidth(["dbt debug"], SIZE) + 20} size={SIZE} at={checksAt + 4} />
      {checks.map((k, i) => (
        <React.Fragment key={i}>
          <div style={{ position: "absolute", left: R_X, top: checksY + i * c.h(44) + 4, opacity: ease(frame, k.at, 8) }}>
            <Tick at={k.at + 4} size={24} />
          </div>
          <Line at={k.at} x={R_X + 40} y={checksY + i * c.h(44)} size={24}>
            {k.t}
          </Line>
        </React.Fragment>
      ))}
      <Line at={runAt} x={R_X} y={checksY + c.h(116)}>
        When: a new environment<span style={{ opacity: ease(frame, errAt, 10) }}>, or a connection error</span>
      </Line>
      <Line at={beforeAt} x={R_X} y={checksY + c.h(156)} color={INK_SOFT}>
        Before you debug any model
      </Line>
      <Spot id="plug" at={checksAt + 4} left={1610} top={c.y(LIST_TOP) + c.h(56)} {...plug} />
    </>
  );
};

// ── 20. dbt v2 ──────────────────────────────────────────────────────────────

/** The video's own misspelled column, in a model that refs the page's
 *  staging model. */
const TYPO = "custmer_id";
const TYPO_LINE = [`SELECT ${TYPO} FROM {{ ref('stg_customers') }}`];

const V2: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const rustAt = c.w("r-v2", "It's the engine rewritten in Rust");
  const gaAt = c.w("r-v2", "generally available since September 2026");
  const distAt = c.w("r-v2", "the main distribution is now just called dbt");
  const coreAt = c.w("r-v2", "dbt Core names the Python");
  const endsAt = c.w("r-v2", "ending at one point thirteen");
  const parsesAt = c.w("r-v2", "It parses and type-checks your SQL");
  const typoAt = c.w("r-v2", "a misspelled column is caught at compile time");
  const yamlAt = c.w("r-v2", "it validates YAML strictly");
  const fixedAt = c.w("r-v2", "has to be fixed first");
  const top = c.y(LIST_TOP);
  const NAME_X = R_X + 150;
  // Three names under the engine: dbt, dbt OSS and dbt Core, a row each.
  const ROW_H = c.h(38);
  const sqlTop = top + c.h(186) + ROW_H;
  const yamlY = sqlTop + listingHeight(1, SIZE) + c.h(76);
  return (
    <>
      <Fact at={rustAt} c={c}>
        The engine, rewritten in {DBT_V2.language}
      </Fact>
      <Line at={gaAt} x={R_X} y={top + c.h(42)} color={INK_SOFT}>
        The <span style={{ color: INK, fontWeight: 600 }}>{DBT_V2.engineName}</span> engine, generally available since {DBT_V2.generallyAvailable}
      </Line>
      <Line at={distAt} x={R_X} y={top + c.h(92)} size={24}>
        <Code>dbt</Code>
      </Line>
      <Line at={distAt + 4} x={NAME_X} y={top + c.h(92)} size={24}>
        The main distribution<span style={{ color: INK_SOFT, opacity: ease(frame, distAt + 14, 10) }}>, under dbt&rsquo;s own license</span>
      </Line>
      {/* The licence half of the page's "Naming and licensing", on screen
          only: "r-v2" was voiced on its own, and these rows are up for
          about 20 s. */}
      <Line at={distAt + 24} x={R_X} y={top + c.h(92) + ROW_H} size={24}>
        <Code>dbt OSS</Code>
      </Line>
      <Line at={distAt + 28} x={NAME_X} y={top + c.h(92) + ROW_H} size={24}>
        Its {DBT_V2.ossLicense} subset
      </Line>
      <Line at={coreAt} x={R_X} y={top + c.h(130) + ROW_H} size={24}>
        <Code>dbt Core</Code>
      </Line>
      <Line at={coreAt + 4} x={NAME_X} y={top + c.h(130) + ROW_H} size={24}>
        The Python {DBT_V2.coreLine} line<span style={{ color: INK_SOFT, opacity: ease(frame, endsAt, 10) }}>, ending at {DBT_V2.coreEndsAt}</span>
      </Line>
      <Listing
        lines={TYPO_LINE}
        x={R_X}
        top={sqlTop}
        width={listingWidth(TYPO_LINE, SIZE) + 20}
        size={SIZE}
        at={parsesAt}
        marks={[{ line: TYPO, text: TYPO, at: typoAt + 4, color: MARK_RED }]}
      />
      <Line at={typoAt + 10} x={R_X} y={sqlTop + listingHeight(1, SIZE) + c.h(14)} color={OK_INK} weight={600}>
        Caught at compile time, not by the warehouse
      </Line>
      <Line at={yamlAt} x={R_X} y={yamlY} size={24}>
        Strict YAML: <Code color={ACCENT_INK}>tests:</Code>
        <span style={{ opacity: ease(frame, fixedAt - 6, 10) }}>
          {" "}→ <Code color={OK_INK}>{DBT_V2.testsKey}:</Code>
        </span>
      </Line>
      <Line at={fixedAt} x={R_X} y={yamlY + c.h(40)} color={INK_SOFT}>
        Every {DBT_V2.coreLine} deprecation warning, fixed first
      </Line>
    </>
  );
};

/**
 * The quick round: ten questions down the left, each row the question as it
 * is read; each answer's key fact on the right while it is current, with its
 * evidence under it (the page's listings, the macro's two results from
 * Postgres, the exposure lit back along its edges). Then the bridge into
 * incremental models, the weaver bird back on the page.
 */
export const RapidScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const quickAt = n.word("rapid-in", "Ten quick ones");
  const end = n.beat("next").from - 4;
  const tableAt = n.word("next", "A table materialization recomputes everything");
  const billionAt = n.word("next", "For a billion-row table");
  const nightAt = n.word("next", "every night");
  const cutAt = n.word("next", "that's the cost incremental models cut");
  const nextAt = n.word("next", "Next:");

  const at = (beat: string, q: string) => n.word(beat, q);
  const items: RapidItem[] = [
    { n: 11, label: "What are seeds in dbt?", at: at("r-seeds", "Question eleven"), body: <Seeds c={c} /> },
    { n: 12, label: "How do macros work in dbt?", at: at("r-macros", "Question twelve"), body: <Macros c={c} /> },
    { n: 13, label: "What are dbt packages, and how do you add one?", at: at("r-packages", "Question thirteen"), body: <Packages c={c} /> },
    { n: 14, label: "How do you pass variables into dbt models?", at: at("r-vars", "Question fourteen"), body: <Vars c={c} /> },
    { n: 15, label: "What are exposures in dbt?", at: at("r-exposures", "Question fifteen"), body: <Exposures c={c} /> },
    { n: 16, label: "How does dbt manage documentation and lineage?", at: at("r-docs", "Question sixteen"), body: <Docs c={c} /> },
    {
      n: 17,
      label: (
        <>
          What is the <Code>dbt_project.yml</Code> file, and what does it control?
        </>
      ),
      at: at("r-project", "Question seventeen"),
      body: <Project c={c} />,
    },
    { n: 18, label: "How do you version a dbt model?", at: at("r-version", "Question eighteen"), body: <Versions c={c} /> },
    {
      n: 19,
      label: (
        <>
          What is <Code>dbt debug</Code>, and when do you use it?
        </>
      ),
      at: at("r-debug", "Question nineteen"),
      body: <Debug c={c} />,
    },
    { n: 20, label: "What is dbt v2, and how does it relate to dbt Core?", at: at("r-v2", "Question twenty"), body: <V2 c={c} /> },
  ];
  const bird = artBox("weaver-bird", 330);
  const listBottom = y(LIST_TOP) + items.length * h(ROW);

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={quickAt} level={-33} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-32} />
      ))}
      <Sfx name="el-pop" at={at("r-packages", "Shared dbt projects") + 4} level={-31} />
      <Sfx name="el-pop" at={at("r-exposures", "a dashboard")} level={-31} />
      <Sfx name="el-pop" at={at("r-debug", "It checks your connection setup") + 4} level={-31} />
      <Sfx name="el-pop" at={billionAt} level={-31} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={quickAt}>Quick round</Kicker>
        <Headline lead="Ten quick ones" turn="to finish." at={quickAt} turnAt={quickAt + 8} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={780} at={quickAt + 6} end={end} />
        <VRule x={950} top={y(LIST_TOP)} bottom={listBottom} at={items[0].at} />

        {/* The bridge: a table rebuilds everything, every night. */}
        <Note at={tableAt} x={R_X} y={y(LIST_TOP)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            A <Code>table</Code> recomputes everything, every run
          </span>
        </Note>
        <Note at={billionAt} x={R_X} y={y(LIST_TOP) + h(52)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            A billion rows<span style={{ opacity: ease(frame, nightAt, 10) }}>, every night</span>
          </span>
        </Note>
        <Note at={cutAt} x={R_X} y={y(LIST_TOP) + h(104)}>
          <span style={{ ...note(28, INK), whiteSpace: "nowrap" }}>
            The cost <Mark at={cutAt + 6}>incremental models</Mark> cut
          </span>
        </Note>
        <NextLine at={nextAt} x={R_X} y={y(LIST_TOP) + h(190)} width={520}>
          Incremental models
        </NextLine>
        <Spot id="weaver-bird" at={billionAt} left={1480} top={y(600)} {...bird} />
      </Drift>
    </AbsoluteFill>
  );
};
