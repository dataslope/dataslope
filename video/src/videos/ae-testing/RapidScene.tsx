import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK, OK_INK, QMono, RapidFire, type RapidItem } from "../../editorial/interview";
import { type Layout, useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note, svgText, TABULAR } from "../../editorial/style";
import { Ink, NextLine, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds, inkOf } from "../../theme/brand";
import { MONO } from "../../theme/fonts";
import { QUICK, UNIQUE } from "./data";
import { Box, Chip, DataTable, Drift, Flow, Headline, Kicker, Listing, listingWidth, MARK_RED, SmallMono, Spot, Svg, TableName, tableGeometry, type Tone, X0 } from "./parts";

const LIST_TOP = 326;
const ROW = 58;
/** Where each answer is drawn, right of the list. */
const BX = 1050;
const B_TOP = 330;

type Ctx = { w: (beat: string, phrase: string, opts?: { nth?: number }) => number; y: Layout["y"]; h: Layout["h"] };

/** An answer's key fact: one line over its figure. */
const Fact: React.FC<{ at: number; top: number; color?: string; children: React.ReactNode }> = ({ at, top, color = INK, children }) => (
  <Ink at={at} dur={12} style={{ left: BX, top, whiteSpace: "nowrap" }}>
    <span style={{ ...note(26, color), fontWeight: 600 }}>{children}</span>
  </Ink>
);

// ── 11. Source test vs model test ───────────────────────────────────────────

const Source: React.FC<{ c: Ctx }> = ({ c }) => {
  const sourceAt = c.w("r-source", "A source test checks raw data");
  const ingestAt = c.w("r-source", "points straight at ingestion");
  const modelAt = c.w("r-source", "A model test guards your own logic");
  const bothAt = c.w("r-source", "Do both");
  const top = c.y(B_TOP + 20);
  const nodes = ["raw.orders", "stg_orders", "fct_orders"];
  const W = 210;
  const GAP = 70;
  const nx = (i: number) => BX + i * (W + GAP);
  return (
    <>
      {nodes.map((name, i) => (
        <React.Fragment key={name}>
          <Box x={nx(i)} y={top} w={W} h={c.h(56)} at={sourceAt - 6 + i * 4} title={name} mono size={20} />
          {i > 0 ? <Flow points={[[nx(i - 1) + W + 6, top + c.h(28)], [nx(i) - 8, top + c.h(28)]]} at={sourceAt - 2 + i * 4} /> : null}
        </React.Fragment>
      ))}
      <Ink at={sourceAt + 6} dur={10} style={{ left: nx(0), top: top + c.h(76), whiteSpace: "nowrap" }}>
        <Chip tone="yellow" size={20}>
          source test
        </Chip>
      </Ink>
      <Note at={ingestAt} x={nx(0)} y={top + c.h(126)}>
        <div style={{ ...note(21, INK), whiteSpace: "nowrap" }}>Raw data as it lands</div>
        <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 6 }}>Points at ingestion</div>
      </Note>
      {[1, 2].map((i) => (
        <Ink key={i} at={modelAt + 4 + (i - 1) * 4} dur={10} style={{ left: nx(i), top: top + c.h(76), whiteSpace: "nowrap" }}>
          <Chip tone="blue" size={20}>
            model test
          </Chip>
        </Ink>
      ))}
      <Note at={modelAt + 10} x={nx(1)} y={top + c.h(126)}>
        <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>Guards your own logic</span>
      </Note>
      <Fact at={bothAt} top={top + c.h(240)} color={OK_INK}>
        Do both
      </Fact>
    </>
  );
};

// ── 12. Staging or marts ────────────────────────────────────────────────────

const Where: React.FC<{ c: Ctx }> = ({ c }) => {
  const bothAt = c.w("r-where", "Both");
  const stagingAt = c.w("r-where", "Staging tests catch upstream problems early");
  const martAt = c.w("r-where", "mart tests guard the grain");
  const endAt = c.w("r-where", "Test only at the end");
  const farAt = c.w("r-where", "a bug travels far");
  const top = c.y(B_TOP);
  const cols = [
    { head: "Staging", sub: "Upstream problems, early", at: stagingAt, x: BX },
    { head: "Marts", sub: "The grain and the metrics", at: martAt, x: BX + 390 },
  ];
  const frame = useCurrentFrame();
  return (
    <>
      <Fact at={bothAt} top={top} color={OK_INK}>
        Both
      </Fact>
      {cols.map((col, i) => (
        <React.Fragment key={col.head}>
          {i > 0 ? <div style={{ position: "absolute", left: col.x - 40, top: top + c.h(86), width: 1, height: c.h(76) * ease(frame, col.at - 2, 14), background: HAIRLINE }} /> : null}
          <Ink at={col.at - 2} dur={12} style={{ left: col.x, top: top + c.h(84), whiteSpace: "nowrap" }}>
            <div style={{ ...label(24, INK), fontWeight: 600 }}>{col.head}</div>
            <div style={{ ...note(22, INK_SOFT), marginTop: 10 }}>{col.sub}</div>
          </Ink>
        </React.Fragment>
      ))}
      {/* A bug that only the end catches, travelling the length of the DAG. */}
      <Svg opacity={ease(frame, endAt - 2, 10)}>
        <line x1={BX} y1={top + c.h(250)} x2={BX + 700} y2={top + c.h(250)} stroke={ds("gray", 400)} strokeWidth={2} strokeDasharray="6 7" />
        <circle cx={BX + 700 * ease(frame, farAt - 6, 40)} cy={top + c.h(250)} r={9} fill={ACCENT} />
      </Svg>
      <Note at={endAt} x={BX} y={top + c.h(274)}>
        <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>
          Test only at the end<span style={{ opacity: ease(frame, farAt, 10) }}>: a bug travels far before it&rsquo;s caught</span>
        </span>
      </Note>
    </>
  );
};

// ── 13. A data contract ─────────────────────────────────────────────────────

const Contract: React.FC<{ c: Ctx }> = ({ c }) => {
  const declAt = c.w("r-contract", "An enforced declaration");
  const typesAt = c.w("r-contract", "types");
  const constraintsAt = c.w("r-contract", "constraints");
  const shapeAt = c.w("r-contract", "If the SQL produces a different shape");
  const failsAt = c.w("r-contract", "the build fails");
  const consumerAt = c.w("r-contract", "before any consumer sees it");
  const top = c.y(B_TOP + 30);
  const lines = QUICK.contract;
  const w = listingWidth(lines, 19);
  const rx = BX + w + 50;
  const declared = lines.filter((l) => l.includes("- name:") && !l.includes("fct_orders")).map((l) => l.split("name:")[1].trim());
  const renamed = declared[declared.length - 1];
  const frame = useCurrentFrame();
  return (
    <>
      <Listing
        lines={lines}
        lang="yaml"
        x={BX}
        top={top}
        size={19}
        at={declAt - 6}
        step={2}
        marks={[
          { line: "contract:", text: "contract: {enforced: true}", at: declAt + 4 },
          { line: "data_type: bigint", text: "data_type: bigint", at: typesAt },
          { line: "data_type: numeric", text: "data_type: numeric", at: typesAt + 4 },
          { line: "- type: not_null", text: "type: not_null", at: constraintsAt },
        ]}
      />
      <Note at={shapeAt} x={rx} y={top}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>The SQL now returns</span>
      </Note>
      <Ink at={shapeAt + 6} dur={12} style={{ left: rx, top: top + c.h(44), whiteSpace: "nowrap" }}>
        <div style={{ display: "flex", gap: 24, fontFamily: MONO, fontSize: 21, borderTop: `2px solid ${INK}`, borderBottom: `1.5px solid ${INK}`, padding: "10px 4px" }}>
          <span style={{ color: INK_SOFT }}>{declared[0]}</span>
          <span style={{ color: ACCENT_INK }}>{renamed.replace(/_usd$/, "")}</span>
        </div>
      </Ink>
      <Note at={shapeAt + 14} x={rx} y={top + c.h(110)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>
          not <SmallMono color={INK}>{renamed}</SmallMono>
        </span>
      </Note>
      <Ink at={failsAt} dur={10} style={{ left: rx, top: top + c.h(170), whiteSpace: "nowrap" }}>
        <Chip tone="red" size={22}>
          build fails
        </Chip>
      </Ink>
      <Note at={consumerAt} x={rx} y={top + c.h(226)}>
        <div style={{ ...note(21, INK), whiteSpace: "nowrap" }}>Before any consumer</div>
        <div style={{ ...note(21, INK), whiteSpace: "nowrap", opacity: ease(frame, consumerAt + 8, 10) }}>sees it</div>
      </Note>
    </>
  );
};

// ── 14. Severity ────────────────────────────────────────────────────────────

const Severity: React.FC<{ c: Ctx }> = ({ c }) => {
  const errorAt = c.w("r-severity", "Error, the default");
  const invariantAt = c.w("r-severity", "invariants like a unique key");
  const warnAt = c.w("r-severity", "Warn logs and carries on");
  const thresholdsAt = c.w("r-severity", "Thresholds can warn at one failing row");
  const hundredAt = c.w("r-severity", "error at a hundred");
  const frame = useCurrentFrame();
  const top = c.y(B_TOP + 30);
  const lines = QUICK.severity;
  // The dial: failing rows on a log scale, 0 at the left.
  // Lowered 20 px from where it first sat, to make room for the caption that
  // names the two threshold keys between the listing and the dial's labels.
  const dial = { x0: BX + 20, x1: BX + 720, y: c.y(B_TOP + 490) };
  const pos = (rows: number) => (rows === 0 ? dial.x0 : dial.x0 + 120 + (Math.log10(rows) / 3) * (dial.x1 - dial.x0 - 120));
  const p = ease(frame, thresholdsAt - 4, 16);
  return (
    <>
      <Note at={errorAt} x={BX} y={top - c.h(6)}>
        <div style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <Chip tone="red" size={21}>
            error
          </Chip>{" "}
          the default: fails the run
          <span style={{ color: INK_SOFT, opacity: ease(frame, invariantAt, 10) }}>, for invariants</span>
        </div>
      </Note>
      <Note at={warnAt} x={BX} y={top + c.h(56)}>
        <div style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          <Chip tone="yellow" size={21}>
            warn
          </Chip>{" "}
          logs and carries on, for soft signals
        </div>
      </Note>
      <Listing lines={lines} lang="yaml" x={BX} top={top + c.h(130)} size={19} at={warnAt + 4} marks={[{ line: "severity: warn", text: "severity: warn", at: warnAt + 16 }]} />
      {/* The dial is not the listing above it: dbt ignores error_if on a
          warn-severity test, so the thresholds are named, with the severity
          they need. */}
      <Note at={thresholdsAt - 4} x={BX} y={dial.y - c.h(124)}>
        <div style={{ ...note(21, INK), whiteSpace: "nowrap" }}>
          Thresholds: <SmallMono>warn_if</SmallMono>, <SmallMono>error_if</SmallMono>
          <span style={{ color: INK_SOFT }}>
            , at the default <SmallMono>error</SmallMono> severity
          </span>
        </div>
      </Note>
      <Svg opacity={p}>
        <rect x={pos(1)} y={dial.y - 26} width={(pos(100) - pos(1)) * p} height={26} fill={`color-mix(in srgb, ${ds("yellow", 400)} 40%, transparent)`} />
        <rect x={pos(100)} y={dial.y - 26} width={(dial.x1 - pos(100)) * ease(frame, hundredAt, 14)} height={26} fill={`color-mix(in srgb, ${ds("red", 400)} 30%, transparent)`} />
        <line x1={dial.x0} y1={dial.y} x2={dial.x1} y2={dial.y} stroke={INK} strokeWidth={2} />
        {[0, 1, 10, 100, 1000].map((v) => (
          <g key={v}>
            <line x1={pos(v)} y1={dial.y} x2={pos(v)} y2={dial.y + 8} stroke={INK_SOFT} strokeWidth={1.5} />
            <text x={pos(v)} y={dial.y + 32} textAnchor="middle" style={svgText({ ...note(19, INK_SOFT), ...TABULAR })}>
              {v.toLocaleString("en-US")}
            </text>
          </g>
        ))}
        <text x={pos(1) + 8} y={dial.y - 36} style={svgText(label(20, inkOf.yellow))}>
          warn at 1
        </text>
        <text x={pos(100) + 8} y={dial.y - 36} style={svgText(label(20, ACCENT_INK))} opacity={ease(frame, hundredAt, 10)}>
          error at 100
        </text>
        <text x={dial.x1} y={dial.y + 60} textAnchor="end" style={svgText(note(19, INK_SOFT))}>
          failing rows
        </text>
      </Svg>
    </>
  );
};

// ── 15. Alert fatigue ───────────────────────────────────────────────────────

const Fatigue: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const steps = [
    { text: "Choose severities deliberately", at: c.w("r-fatigue", "Choose those severities") },
    { text: "Use the thresholds", at: c.w("r-fatigue", "use the thresholds") },
    { text: "Fix or delete tests that fail for known reasons", at: c.w("r-fatigue", "fix or delete tests") },
  ];
  const wolfAt = c.w("r-fatigue", "A suite that cries wolf");
  const ignoredAt = c.w("r-fatigue", "gets ignored");
  const top = c.y(B_TOP);
  const ignored = ease(frame, ignoredAt, 16);
  return (
    <>
      {steps.map((s, i) => (
        <Note key={s.text} at={s.at} x={BX} y={top + i * c.h(56)}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>{s.text}</span>
        </Note>
      ))}
      <div style={{ position: "absolute", left: BX, top: top + c.h(220), display: "flex", gap: "0.5em", fontSize: 20 }}>
        {Array.from({ length: 7 }, (_, i) => {
          const p = ease(frame, wolfAt - 4 + i * 3, 8);
          return (
            <span key={i} style={{ opacity: p * (1 - 0.55 * ignored) }}>
              <Chip tone={ignored > 0.5 ? "gray" : "red"} size={20}>
                fail
              </Chip>
            </span>
          );
        })}
      </div>
      <Note at={wolfAt + 10} x={BX} y={top + c.h(290)}>
        <span style={{ ...note(24, ACCENT_INK), whiteSpace: "nowrap" }}>
          A suite that cries wolf<span style={{ opacity: ease(frame, ignoredAt, 10) }}> gets ignored</span>
        </span>
      </Note>
    </>
  );
};

// ── 16. dbt_utils and dbt_expectations ──────────────────────────────────────

const Packages: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const rangesAt = c.w("r-packages", "Accepted ranges");
  const exprAt = c.w("r-packages", "expressions that must hold");
  const compoundAt = c.w("r-packages", "compound keys");
  const boundsAt = c.w("r-packages", "row-count bounds");
  const distAt = c.w("r-packages", "distribution checks");
  const leaveAt = c.w("r-packages", "the sanity checks the four built-ins leave out");
  const top = c.y(B_TOP);
  const cols = [
    {
      name: "dbt_utils",
      x: BX,
      tests: [
        { text: "accepted_range", at: rangesAt, mono: true },
        { text: "expression_is_true", at: exprAt, mono: true },
        { text: "not_null_proportion", at: exprAt + 8, mono: true },
        { text: "unique_combination_of_columns", at: compoundAt, mono: true },
      ],
    },
    {
      name: "dbt_expectations",
      x: BX + 450,
      tests: [
        { text: "Value-set membership", at: boundsAt - 8, mono: false },
        { text: "Row-count bounds", at: boundsAt, mono: false },
        { text: "Distributions", at: distAt, mono: false },
      ],
    },
  ];
  return (
    <>
      {cols.map((col, i) => (
        <React.Fragment key={col.name}>
          {i > 0 ? <div style={{ position: "absolute", left: col.x - 40, top: top + 4, width: 1, height: c.h(240) * ease(frame, col.tests[0].at - 6, 14), background: HAIRLINE }} /> : null}
          <Ink at={col.tests[0].at - 6} dur={12} style={{ left: col.x, top, whiteSpace: "nowrap" }}>
            <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 500, color: INK }}>{col.name}</span>
          </Ink>
          {col.tests.map((t, k) => (
            <Ink key={t.text} at={t.at} dur={10} style={{ left: col.x, top: top + c.h(56) + k * c.h(46), whiteSpace: "nowrap" }}>
              {t.mono ? <span style={{ fontFamily: MONO, fontSize: 20, color: INK }}>{t.text}</span> : <span style={{ ...note(21, INK) }}>{t.text}</span>}
            </Ink>
          ))}
        </React.Fragment>
      ))}
      <Note at={distAt + 10} x={BX + 450} y={top + c.h(56) + 3 * c.h(46) + c.h(8)}>
        <div style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>The maintained one:</div>
        <div style={{ fontFamily: MONO, fontSize: 19, color: INK, whiteSpace: "nowrap", marginTop: 6 }}>metaplane/dbt_expectations</div>
      </Note>
      <Note at={leaveAt} x={BX} y={top + c.h(300)}>
        <span style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap" }}>The sanity checks the four built-ins leave out</span>
      </Note>
    </>
  );
};

// ── 17. Unit tests ──────────────────────────────────────────────────────────

const Unit: React.FC<{ c: Ctx }> = ({ c }) => {
  const mockedAt = c.w("r-unit", "runs a model's logic on mocked rows");
  const expectedAt = c.w("r-unit", "compares an expected output");
  const ciAt = c.w("r-unit", "runs in CI with no real data");
  const dataAt = c.w("r-unit", "Data tests check the real data");
  const top = c.y(B_TOP + 20);
  const W = 200;
  const GAP = 60;
  const row = (y: number, names: readonly string[], at: number, tones: Tone[] = []) =>
    names.map((name, i) => (
      <React.Fragment key={name}>
        <Box x={BX + i * (W + GAP)} y={y} w={W} h={c.h(56)} at={at + i * 6} title={name} size={21} tones={tones[i] ? [{ at: at + i * 6, tone: tones[i] }] : []} />
        {i > 0 ? <Flow points={[[BX + i * (W + GAP) - GAP + 6, y + c.h(28)], [BX + i * (W + GAP) - 8, y + c.h(28)]]} at={at + i * 6 - 2} /> : null}
      </React.Fragment>
    ));
  return (
    <>
      <Note at={mockedAt - 4} x={BX} y={top - c.h(40)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Unit test (dbt 1.8 and later)</span>
      </Note>
      {row(top, ["Mocked rows", "The model", "Expected rows"], mockedAt)}
      <Note at={expectedAt + 4} x={BX + 2 * (W + GAP)} y={top + c.h(70)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>compared</span>
      </Note>
      <Note at={ciAt} x={BX} y={top + c.h(110)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Runs in CI, with no real data</span>
      </Note>
      <Note at={dataAt - 4} x={BX} y={top + c.h(200)}>
        <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Data test</span>
      </Note>
      {row(top + c.h(240), ["Warehouse rows", "The test"], dataAt)}
      <Note at={dataAt + 12} x={BX} y={top + c.h(312)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Checks the real data</span>
      </Note>
    </>
  );
};

// ── 18. store_failures ──────────────────────────────────────────────────────

const Store: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const writesAt = c.w("r-store", "It writes the failing rows to a table");
  const countingAt = c.w("r-store", "instead of just counting them");
  const redAt = c.w("r-store", "a red check becomes a dataset");
  const queryAt = c.w("r-store", "you can query");
  const top = c.y(B_TOP + 20);
  const r = UNIQUE.test.result;
  const g = tableGeometry({ x: BX + 330, top: top + c.h(30), cols: r.cols.map((name) => ({ name })), rows: r.rows, headH: c.h(38), rowH: c.h(38), headSize: 19, bodySize: 21, pad: 18 });
  return (
    <>
      <Ink at={writesAt - 6} dur={10} style={{ left: BX, top: top + c.h(60), whiteSpace: "nowrap" }}>
        <Chip tone="red" size={22}>
          unique: {r.rows.length} failing
        </Chip>
      </Ink>
      <Note at={countingAt} x={BX} y={top + c.h(116)}>
        <span style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap" }}>Just a count</span>
      </Note>
      <Flow points={[[BX + 236, top + c.h(80)], [g.x - 14, top + c.h(80)]]} at={writesAt + 4} />
      <TableName g={g} at={writesAt + 10}>
        Failing rows, stored
      </TableName>
      <DataTable
        g={g}
        cols={r.cols.map((name) => ({ name, numeric: true }))}
        rows={r.rows.map((cells, i) => ({ cells, at: writesAt + 14 + i * 4 }))}
        at={writesAt + 10}
        bands={r.rows.map((_, i) => ({ row: i, at: redAt + i * 3, color: MARK_RED }))}
      />
      <Note at={redAt + 6} x={BX} y={g.rowTop(r.rows.length) + c.h(30)}>
        <span style={{ ...note(23, INK), whiteSpace: "nowrap" }}>
          A red check becomes a dataset<span style={{ opacity: ease(frame, queryAt, 10) }}> you can query</span>
        </span>
      </Note>
    </>
  );
};

// ── 19. Fix upstream ────────────────────────────────────────────────────────

const Upstream: React.FC<{ c: Ctx }> = ({ c }) => {
  const frame = useCurrentFrame();
  const coalesceAt = c.w("r-upstream", "A coalesce in one model");
  const hidesAt = c.w("r-upstream", "hides the defect");
  const copiedAt = c.w("r-upstream", "has to be copied into every consumer");
  const sourceAt = c.w("r-upstream", "anything reading the source");
  const onceAt = c.w("r-upstream", "Fix it once, at the source");
  const top = c.y(B_TOP + 10);
  const src = { x: BX, y: top + c.h(120), w: 210 };
  const models = ["fct_orders", "fct_revenue", "dim_customer"];
  // The patch chips end about 95px clear of the frame edge.
  const mx = BX + 340;
  const my = (i: number) => top + i * c.h(120);
  const fixed = ease(frame, onceAt, 12);
  return (
    <>
      <Box
        x={src.x}
        y={src.y}
        w={src.w}
        h={c.h(56)}
        at={coalesceAt - 8}
        title="raw.orders"
        mono
        size={20}
        tones={[
          { at: sourceAt, tone: "bad" },
          { at: onceAt + 4, tone: "ok" },
        ]}
      />
      {models.map((m, i) => {
        const patchAt = i === 0 ? coalesceAt + 4 : copiedAt + 6 + (i - 1) * 6;
        return (
          <React.Fragment key={m}>
            <Flow
              points={
                Math.abs(my(i) - src.y) < 1
                  ? [
                      [src.x + src.w + 6, src.y + c.h(28)],
                      [mx - 8, my(i) + c.h(28)],
                    ]
                  : [
                      [src.x + src.w + 6, src.y + c.h(28)],
                      [src.x + src.w + 80, src.y + c.h(28)],
                      [src.x + src.w + 80, my(i) + c.h(28)],
                      [mx - 8, my(i) + c.h(28)],
                    ]
              }
              at={coalesceAt - 4 + i * 3}
              color={fixed > 0.5 ? OK : INK}
            />
            <Box x={mx} y={my(i)} w={210} h={c.h(56)} at={coalesceAt - 2 + i * 3} title={m} mono size={20} tones={fixed > 0.5 ? [{ at: onceAt + 6, tone: "ok" }] : []} />
            <Ink at={patchAt} dur={10} out={onceAt + 4} style={{ left: mx + 230, top: my(i) + c.h(10), whiteSpace: "nowrap" }}>
              <Chip tone="red" size={20}>
                COALESCE patch
              </Chip>
            </Ink>
          </React.Fragment>
        );
      })}
      <Note at={hidesAt} x={mx + 230} y={my(0) + c.h(56)} out={copiedAt}>
        <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>Hides the defect</span>
      </Note>
      <Note at={sourceAt + 6} x={src.x} y={src.y + c.h(76)} out={onceAt}>
        <span style={{ ...note(21, ACCENT_INK), whiteSpace: "nowrap" }}>Still bad</span>
      </Note>
      <Note at={onceAt + 6} x={src.x} y={src.y + c.h(76)}>
        <span style={{ ...note(21, OK_INK), fontWeight: 600, whiteSpace: "nowrap" }}>Fixed once, for all three</span>
      </Note>
    </>
  );
};

/**
 * The quick round: nine questions down the left, each read as the page asks
 * it, its answer's key fact and figure on the right while it is read. Then
 * the bridge into metrics, with the woodpecker back on the page.
 */
export const RapidScene: React.FC = () => {
  const n = useNarration();
  const { y, h } = useLayout();
  const c: Ctx = { w: n.word, y, h };

  const from = n.beat("rapid-in").from;
  const nineAt = n.word("rapid-in", "Nine quick ones");
  const finishAt = n.word("rapid-in", "to finish");
  const end = n.beat("next").from - 4;
  const expectedAt = n.word("next", "Tests check each model");
  const passAt = n.word("next", "They can all pass");
  const disagreeAt = n.word("next", "two dashboards disagree about revenue");
  const nextAt = n.word("next", "Next:");

  const q = (text: React.ReactNode) => <span style={{ fontSize: 20 }}>{text}</span>;
  const items: RapidItem[] = [
    { n: 11, label: q("What is the difference between a source test and a model test?"), at: n.word("r-source", "Question eleven"), body: <Source c={c} /> },
    { n: 12, label: q("Where should tests live, at staging or in marts?"), at: n.word("r-where", "Question twelve"), body: <Where c={c} /> },
    { n: 13, label: q("What is a data contract in dbt?"), at: n.word("r-contract", "Question thirteen"), body: <Contract c={c} /> },
    {
      n: 14,
      label: q(
        <>
          What is test severity, and when do you use <QMono>warn</QMono> vs <QMono>error</QMono>?
        </>,
      ),
      at: n.word("r-severity", "Question fourteen"),
      body: <Severity c={c} />,
    },
    { n: 15, label: q("How do you avoid alert fatigue from noisy tests?"), at: n.word("r-fatigue", "Question fifteen"), body: <Fatigue c={c} /> },
    {
      n: 16,
      label: q(
        <>
          What extra tests do <QMono>dbt_utils</QMono> and <QMono>dbt_expectations</QMono> add?
        </>,
      ),
      at: n.word("r-packages", "Question sixteen"),
      body: <Packages c={c} />,
    },
    { n: 17, label: q("What are dbt unit tests, and how do they differ from data tests?"), at: n.word("r-unit", "Question seventeen"), body: <Unit c={c} /> },
    {
      n: 18,
      label: q(
        <>
          What is <QMono>store_failures</QMono>, and why enable it?
        </>,
      ),
      at: n.word("r-store", "Question eighteen"),
      body: <Store c={c} />,
    },
    { n: 19, label: q("Why prefer fixing data upstream over patching it in a downstream model?"), at: n.word("r-upstream", "Question nineteen"), body: <Upstream c={c} /> },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-chime" at={nineAt} level={-33} />
      {items.map((it) => (
        <Sfx key={it.n} name="el-tap" at={it.at} level={-33} />
      ))}
      <Sfx name="el-pop" at={expectedAt + 4} level={-30} />
      <Sfx name="el-tap" at={disagreeAt} level={-33} />
      <Sfx name="el-pencil" at={nextAt} level={-34} />

      <Drift from={from} to={n.beat("next").to + 40}>
        <Kicker at={nineAt}>Quick round</Kicker>
        <Headline lead="Nine quick ones" turn="to finish." at={nineAt} turnAt={finishAt - 2} size={64} />
        <RapidFire items={items} x={X0} top={y(LIST_TOP)} rowH={h(ROW)} width={880} at={nineAt + 6} end={end} />

        {/* ── The bridge ── */}
        <Spot art="woodpecker" at={expectedAt + 4} left={1570} top={y(330)} width={210} />
        <Note at={expectedAt} x={BX} y={y(380)}>
          <span style={{ ...note(26, INK), whiteSpace: "nowrap" }}>Tests check each model</span>
          <div style={{ ...note(26, INK_SOFT), whiteSpace: "nowrap", marginTop: 6 }}>against what you expected</div>
        </Note>
        <Note at={passAt} x={BX} y={y(520)}>
          <span style={{ ...note(26, INK), fontWeight: 600, whiteSpace: "nowrap" }}>All can pass</span>
        </Note>
        <Note at={disagreeAt} x={BX} y={y(520) + h(42)}>
          <span style={{ ...note(26, ACCENT_INK), fontWeight: 600, whiteSpace: "nowrap" }}>while two dashboards disagree</span>
        </Note>
        <NextLine at={nextAt} x={BX} y={y(740)} width={700}>
          metrics and the semantic layer
        </NextLine>
      </Drift>
    </AbsoluteFill>
  );
};
