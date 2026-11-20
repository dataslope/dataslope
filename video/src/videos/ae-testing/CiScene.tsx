import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease } from "../../components/motion";
import { OK_INK, QuestionCard } from "../../editorial/interview";
import { useLayout } from "../../editorial/layout";
import { ACCENT, ACCENT_INK, HAIRLINE, INK, INK_SOFT, label, note } from "../../editorial/style";
import { Ink, Note } from "../../editorial/ui";
import { useNarration } from "../../narration/NarrationContext";
import { Sfx } from "../../sound/Sfx";
import { ds } from "../../theme/brand";
import { CI, CI_SELECTED } from "./data";
import { Box, Chip, Drift, Flow, Listing, ListingTitle, SmallMono, Spot, Strike, Svg, type Tone, X0 } from "./parts";

const NODE = { w: 220, h: 58 };
const GAP_X = 80;

/** The page's DAG, laid out: sources in the first column, the staging
 *  models in the second, dim_customer in the third, fct_orders last. Each
 *  node's column and row come from its name; the edges are the page's. */
const place = (name: string): { col: number; row: number } => {
  const customers = name.includes("customer");
  if (name.startsWith("raw.")) return { col: 0, row: customers ? 1 : 0 };
  if (name.startsWith("stg_")) return { col: 1, row: customers ? 1 : 0 };
  if (name.startsWith("dim_")) return { col: 2, row: 1 };
  return { col: 3, row: 0 };
};

type NodeState = { at: number; tones?: { at: number; tone: Tone }[]; sub?: React.ReactNode; dim?: number; out?: number; glow?: number };

/** The page's lineage, drawn with outlined boxes and ink arrows. */
const Dag: React.FC<{
  x: number;
  top: number;
  rowGap: number;
  at: number;
  state?: (name: string) => Partial<NodeState>;
  out?: number;
  edgeColor?: (from: string, to: string) => string;
  h: (v: number) => number;
}> = ({ x, top, rowGap, at, state, out, edgeColor = () => INK, h }) => {
  const nodeH = h(NODE.h);
  const pos = (name: string) => {
    const p = place(name);
    return { x: x + p.col * (NODE.w + GAP_X), y: top + p.row * rowGap };
  };
  const order = (name: string) => place(name).col;
  return (
    <>
      {CI.edges.map(([a, b]) => {
        const pa = pos(a);
        const pb = pos(b);
        const start: [number, number] = [pa.x + NODE.w + 6, pa.y + nodeH / 2];
        const endPt: [number, number] = [pb.x - 8, pb.y + nodeH / 2];
        const pts: [number, number][] =
          pa.y === pb.y
            ? [start, endPt]
            : [start, [start[0] + GAP_X / 2 - 6, start[1]], [start[0] + GAP_X / 2 - 6, endPt[1]], endPt];
        return <Flow key={`${a}-${b}`} points={pts} at={at + 6 + order(b) * 6} color={edgeColor(a, b)} out={out} />;
      })}
      {CI.nodes.map((node) => {
        const p = pos(node.name);
        const s: Partial<NodeState> = state ? state(node.name) : {};
        return (
          <Box
            key={node.name}
            x={p.x}
            y={p.y}
            w={NODE.w}
            h={nodeH}
            at={s.at ?? at + order(node.name) * 6}
            title={node.name}
            mono
            size={21}
            tones={s.tones}
            glow={s.glow}
            dim={s.dim}
            out={s.out ?? out}
          />
        );
      })}
    </>
  );
};

/**
 * Questions 7 and 8. A pull request runs the page's slim-CI command; the
 * page's DAG beside the production manifest, stg_customers changed, and
 * state:modified+ lighting it and its two descendants (3 of 4 models),
 * stg_orders left grey; a failing test blocks the merge. Question 8: CI and
 * production side by side. In CI the merge is blocked. In production the
 * same DAG builds in order, a test on stg_customers errors, everything
 * downstream is skipped and keeps yesterday's rows, the owner is paged, and
 * a warning waits for triage. Then the response, step by step, with
 * loosening the test struck.
 */
export const CiScene: React.FC = () => {
  const frame = useCurrentFrame();
  const n = useNarration();
  const { y, h } = useLayout();

  const from = n.beat("ci").from;
  const qAt = n.word("ci", "Question seven");
  const qTextAt = n.word("ci", "How does CI for analytics");
  const prAt = n.word("ci", "On every pull request");
  const runsAt = n.word("ci", "runs dbt build");
  const changedAt = n.word("ci", "the models that changed");
  const compareAt = n.word("ci-state", "comparing the project");
  const manifestAt = n.word("ci-state", "production's manifest");
  const deployedAt = n.word("ci-state", "its record of what's deployed");
  const changeAt = n.word("ci-state", "Change the customer staging model");
  const threeAt = n.word("ci-state", "three of the four models");
  const leftAt = n.word("ci-state", "Orders staging is left alone");
  const deferAt = n.word("ci-defer", "With the defer flag");
  const prodCopyAt = n.word("ci-defer", "reads it from production");
  const slimAt = n.word("ci-slim", "That's slim CI");
  const fastAt = n.word("ci-slim", "fast feedback");
  const blocksAt = n.word("ci-slim", "a failing test blocks the merge");
  const q8At = n.word("prod", "Question eight");
  const q8TextAt = n.word("prod", "How do you respond");
  const inProdAt = n.word("prod", "in production");
  const inCiAt = n.word("prod", "In CI, the merge is blocked");
  const fixAt = n.word("prod", "fix the model or the test");
  const sevAt = n.word("prod-sev", "In production, go by severity");
  const haltsAt = n.word("prod-sev", "An error halts everything downstream");
  const pagesAt = n.word("prod-sev", "pages the owner");
  const yesterdayAt = n.word("prod-sev", "the marts keep yesterday's rows");
  const warningAt = n.word("prod-sev", "A warning is triaged later");
  const readAt = n.word("prod-cause", "read the failing rows");
  const decideAt = n.word("prod-cause", "decide whether the data or the assumption");
  const causeAt = n.word("prod-cause", "fix the cause");
  const loosenAt = n.word("prod-cause", "Never loosen the test");
  const end = n.beat("prod-cause").to;

  const q7Out = q8At - 6;

  // ── Question 7 ──
  const cmdTop = y(312);
  const cmdX = X0 + 300;
  const dagTop = y(500);
  const rowGap = h(112);
  // The manifest is compared with the whole project: a dashed bracket down
  // the right of the DAG, the manifest level with its middle.
  const projectBracket = { x: X0 + 3 * (NODE.w + GAP_X) + NODE.w + 34, top: dagTop, bottom: dagTop + rowGap + h(NODE.h) };
  const projectMid = (projectBracket.top + projectBracket.bottom) / 2;
  const manifest = { x: 1420, y: projectMid - h(42) };
  const selected = new Set(CI_SELECTED);
  const ciState = (name: string): Partial<NodeState> => {
    if (!CI.models.includes(name)) return {};
    if (name === CI.changed) return { tones: [{ at: changeAt, tone: "look" }], glow: 0 };
    if (selected.has(name)) return { tones: [{ at: threeAt + 6 + (name.startsWith("dim") ? 0 : 6), tone: "look" }] };
    return { tones: [{ at: leftAt, tone: "off" }] };
  };
  const nodeX = (name: string, x: number) => x + place(name).col * (NODE.w + GAP_X);
  const nodeY = (name: string, top: number, gap: number) => top + place(name).row * gap;

  // ── Question 8 ──
  const colsTop = y(282);
  const CI_COL = X0;
  const PROD_COL = 600;
  const prodDag = { x: PROD_COL, top: y(430), gap: h(112) };
  const failing = CI.changed;
  const downstream = CI_SELECTED.filter((m) => m !== failing);
  const prodState = (name: string): Partial<NodeState> => {
    const col = place(name).col;
    const builtAt = sevAt + 8 + col * 8;
    if (name === failing) return { at: builtAt, tones: [{ at: haltsAt, tone: "bad" }] };
    if (downstream.includes(name)) return { at: builtAt, tones: [{ at: haltsAt + 10, tone: "off" }] };
    return { at: builtAt };
  };
  const stepsTop = y(808);
  const steps = [
    { text: "Read the failing rows", at: readAt },
    { text: "Data or assumption?", at: decideAt },
    { text: "Fix the cause", at: causeAt },
  ];

  return (
    <AbsoluteFill>
      <Sfx name="el-pop" at={prAt} level={-32} />
      <Sfx name="el-pencil" at={runsAt} level={-35} />
      <Sfx name="el-sprinkle" at={compareAt} level={-35} />
      <Sfx name="el-pop" at={manifestAt} level={-32} />
      <Sfx name="el-tap" at={changeAt + 2} level={-33} />
      <Sfx name="el-sprinkle" at={threeAt + 6} level={-34} />
      <Sfx name="el-tap" at={leftAt} level={-35} />
      <Sfx name="el-tap" at={blocksAt + 4} level={-31} />
      <Sfx name="el-whoosh" at={q8At - 6} level={-37} />
      <Sfx name="el-tap" at={inCiAt} level={-34} />
      <Sfx name="el-sprinkle" at={sevAt + 8} level={-35} />
      <Sfx name="el-tap" at={haltsAt} level={-31} />
      <Sfx name="el-pop" at={pagesAt} level={-30} />
      <Sfx name="el-tap" at={warningAt + 2} level={-34} />
      {steps.map((s) => (
        <Sfx key={s.text} name="el-tap" at={s.at} level={-34} />
      ))}
      <Sfx name="el-scratch" at={loosenAt + 10} level={-33} />

      <Drift from={from} to={end + 40}>
        <QuestionCard n={7} at={qAt - 4} textAt={qTextAt - 4} out={q7Out} size={58}>
          How does CI for analytics typically work?
        </QuestionCard>
        <QuestionCard n={8} at={q8At - 2} textAt={q8TextAt - 4} size={58}>
          How do you respond to a failing test in CI vs in production?
        </QuestionCard>

        {/* ── A pull request runs the page's command ── */}
        <Box x={X0} y={cmdTop + h(18)} w={210} h={h(NODE.h)} at={prAt - 2} title="Pull request" size={22} out={q7Out} />
        <Flow points={[[X0 + 216, cmdTop + h(18) + h(NODE.h) / 2], [cmdX - 12, cmdTop + h(18) + h(NODE.h) / 2]]} at={runsAt - 4} out={q7Out} />
        <ListingTitle x={cmdX} top={cmdTop} at={runsAt} out={q7Out}>
          The page&rsquo;s command
        </ListingTitle>
        <Listing
          lines={CI.command}
          lang="sh"
          x={cmdX}
          top={cmdTop}
          size={20}
          at={runsAt}
          out={q7Out}
          marks={[
            { line: "dbt build", text: "state:modified+", at: changedAt + 2 },
            { line: "dbt build", text: "--state ./prod-artifacts", at: manifestAt + 4 },
          ]}
        />

        {/* ── The project against production's manifest ── */}
        <Note at={changedAt + 2} x={X0} y={dagTop - h(52)} out={q7Out}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>The project, on this pull request</span>
        </Note>
        <Dag x={X0} top={dagTop} rowGap={rowGap} at={changedAt + 6} state={ciState} out={q7Out} h={h} />
        <Ink at={changeAt + 6} dur={10} out={q7Out} style={{ left: nodeX(CI.changed, X0) + 20, top: nodeY(CI.changed, dagTop, rowGap) + h(NODE.h) + h(10) }}>
          <Chip tone="yellow" size={20}>
            changed
          </Chip>
        </Ink>
        <Box x={manifest.x} y={manifest.y} w={330} h={h(84)} at={manifestAt - 2} title="Production manifest" sub={<span style={{ opacity: ease(frame, deployedAt, 10) }}>what&rsquo;s deployed</span>} size={22} out={q7Out} />
        <Svg opacity={ease(frame, manifestAt + 2, 12) * (1 - ease(frame, q7Out, 10))}>
          <path
            d={`M${projectBracket.x - 16},${projectBracket.top} h16 V${projectBracket.bottom} h-16`}
            fill="none"
            stroke={ds("gray", 400)}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
        <Flow points={[[manifest.x - 12, projectMid], [projectBracket.x + 6, projectMid]]} at={manifestAt + 6} color={ds("gray", 500)} dash="6 7" out={q7Out} noHead />
        <Note at={manifestAt + 10} x={projectBracket.x + 20} y={projectMid + h(12)} out={q7Out}>
          <span style={{ ...note(20, INK_SOFT), whiteSpace: "nowrap" }}>compared</span>
        </Note>
        {/* fct_orders reads stg_orders, which this run does not build: with
            --defer its ref() resolves to production's copy. */}
        <Note at={deferAt} x={nodeX("stg_orders", X0) + NODE.w + 40} y={nodeY("stg_orders", dagTop, rowGap) - h(36)} out={q7Out}>
          <span style={{ ...note(21, INK), whiteSpace: "nowrap" }}>
            <SmallMono>--defer</SmallMono>
            <span style={{ opacity: ease(frame, prodCopyAt, 10) }}>: read from production</span>
          </span>
        </Note>
        <Note at={threeAt + 10} x={X0} y={dagTop + rowGap + h(NODE.h) + h(62)} out={q7Out}>
          <span style={{ ...note(24, INK), whiteSpace: "nowrap" }}>
            <b>
              {CI_SELECTED.length} of {CI.models.length} models
            </b>{" "}
            built and tested
            <span style={{ color: INK_SOFT, opacity: ease(frame, leftAt, 10) }}>; <SmallMono>stg_orders</SmallMono> left alone</span>
          </span>
        </Note>

        {/* ── Slim CI: a failing test blocks the merge ── */}
        <Note at={slimAt} x={manifest.x} y={projectBracket.bottom + h(10)} out={q7Out}>
          <span style={{ ...note(24, INK), fontWeight: 600, whiteSpace: "nowrap" }}>Slim CI</span>
          <div style={{ ...note(21, INK_SOFT), whiteSpace: "nowrap", marginTop: 8, opacity: ease(frame, fastAt, 10) }}>Fast, without rebuilding every model</div>
        </Note>
        <MergeBlocked x={manifest.x} y={projectBracket.bottom + h(120)} at={blocksAt} out={q7Out} h={h} />

        {/* ── Question 8: CI and production ── */}
        <Ink at={inCiAt - 4} dur={12} style={{ left: CI_COL, top: colsTop, whiteSpace: "nowrap" }}>
          <div style={{ ...label(26, INK), fontWeight: 600 }}>CI</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 10 }}>The merge is blocked</div>
        </Ink>
        <MergeBlocked x={CI_COL} y={colsTop + h(130)} at={inCiAt} h={h} />
        <Note at={fixAt} x={CI_COL} y={colsTop + h(250)}>
          <div style={{ ...note(23, INK), whiteSpace: "nowrap" }}>Fix the model or the test</div>
          <div style={{ ...note(23, INK_SOFT), whiteSpace: "nowrap", marginTop: 6 }}>before it ships</div>
        </Note>
        <div style={{ position: "absolute", left: PROD_COL - 48, top: colsTop + 2, width: 1, height: h(330) * ease(frame, inProdAt - 2, 16), background: HAIRLINE }} />
        <Ink at={inProdAt} dur={12} style={{ left: PROD_COL, top: colsTop, whiteSpace: "nowrap" }}>
          <div style={{ ...label(26, INK), fontWeight: 600 }}>Production</div>
          <div style={{ ...note(23, INK_SOFT), marginTop: 10, opacity: ease(frame, sevAt, 10) }}>Go by severity</div>
        </Ink>
        <Dag x={prodDag.x} top={prodDag.top} rowGap={prodDag.gap} at={sevAt + 8} state={prodState} h={h} edgeColor={(a, b) => (a === failing || downstream.includes(b) ? ds("gray", 400) : INK)} />
        <Ink at={haltsAt + 2} dur={10} style={{ left: nodeX(failing, prodDag.x) + 20, top: nodeY(failing, prodDag.top, prodDag.gap) + h(NODE.h) + h(10) }}>
          <Chip tone="red" size={20}>
            test: error
          </Chip>
        </Ink>
        {downstream.map((m, i) => (
          <Ink key={m} at={haltsAt + 12 + i * 4} dur={10} style={{ left: nodeX(m, prodDag.x) + 20, top: nodeY(m, prodDag.top, prodDag.gap) + h(NODE.h) + h(10) }}>
            <Chip tone="gray" size={20}>
              skipped
            </Chip>
          </Ink>
        ))}
        <Note at={yesterdayAt} x={nodeX("fct_orders", prodDag.x)} y={nodeY("fct_orders", prodDag.top, prodDag.gap) + h(NODE.h) + h(60)}>
          <span style={{ ...note(22, INK), whiteSpace: "nowrap" }}>Keeps yesterday&rsquo;s rows</span>
        </Note>
        <Spot art="pager" at={pagesAt} left={1600} top={prodDag.top + prodDag.gap + h(122)} width={130} />
        <Note at={pagesAt + 4} x={1600 - 40} y={prodDag.top + prodDag.gap + h(160)} align="right">
          <span style={{ ...note(22, ACCENT_INK), whiteSpace: "nowrap" }}>Pages the owner</span>
        </Note>
        <Ink at={warningAt} dur={10} style={{ left: PROD_COL, top: prodDag.top + prodDag.gap + h(NODE.h) + h(78), whiteSpace: "nowrap" }}>
          <span style={{ ...note(22, INK), display: "inline-flex", alignItems: "center", gap: "0.5em", fontSize: 22 }}>
            <Chip tone="yellow" size={22}>
              warn
            </Chip>
            Triage later; the run carries on
          </span>
        </Ink>

        {/* ── Either way ── */}
        <Note at={readAt - 4} x={X0} y={stepsTop - h(44)}>
          <span style={{ ...label(21, INK_SOFT), whiteSpace: "nowrap" }}>Either way</span>
        </Note>
        <div style={{ position: "absolute", left: X0, top: stepsTop, display: "flex", alignItems: "center", fontSize: 24, whiteSpace: "nowrap" }}>
          {steps.map((s, i) => {
            const p = ease(frame, s.at - 2, 12);
            return (
              <React.Fragment key={s.text}>
                {i > 0 ? <span style={{ ...note(24, INK_SOFT), margin: "0 0.7em", opacity: p }}>→</span> : null}
                <span style={{ ...note(24, i === 2 ? OK_INK : INK), fontWeight: i === 2 ? 600 : 500, opacity: p }}>{s.text}</span>
              </React.Fragment>
            );
          })}
          <span style={{ ...note(24, ACCENT_INK), marginLeft: "2em", opacity: ease(frame, loosenAt, 10) }}>
            <Strike at={loosenAt + 10} color={ACCENT}>
              Loosen the test
            </Strike>
          </span>
        </div>
      </Drift>
    </AbsoluteFill>
  );
};

/** A merge button, outlined, turning red with a failing test beside it. */
const MergeBlocked: React.FC<{ x: number; y: number; at: number; out?: number; h: (v: number) => number }> = ({ x, y, at, out, h }) => {
  const frame = useCurrentFrame();
  const o = out === undefined ? 0 : ease(frame, out, 10);
  return (
    <>
      <Box x={x} y={y} w={150} h={h(NODE.h)} at={at - 4} title="Merge" size={22} tones={[{ at: at + 8, tone: "bad" }]} out={out} />
      <Ink at={at + 8} dur={10} out={out} style={{ left: x + 172, top: y + h(NODE.h) / 2 - 18, whiteSpace: "nowrap", opacity: 1 - o }}>
        <span style={{ ...note(22, ACCENT_INK), display: "inline-flex", alignItems: "center", gap: "0.5em", fontSize: 22 }}>
          <Chip tone="red" size={22}>
            test: fail
          </Chip>
          blocked
        </span>
      </Ink>
    </>
  );
};

