#!/usr/bin/env node
// One-off audit: extract and classify every mermaid block in the courses so we
// can triage which diagrams are redundant / too wide / too tall vs. genuinely
// useful structural diagrams. Not part of the build.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = "content/learn";

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

// Pull ```mermaid ... ``` fenced blocks with their start line.
function extractBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const m = lines[i].match(/^(\s*)```mermaid\s*$/);
    if (m) {
      const startLine = i + 1;
      const body = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i]);
        i++;
      }
      blocks.push({ startLine, text: body.join("\n") });
    }
    i++;
  }
  return blocks;
}

// Strip mermaid node-shape labels so edge parsing sees bare ids. Applied
// repeatedly to peel nested shapes like [[..]], ((..)), [(..)], {{..}}.
function stripLabels(line) {
  let prev;
  do {
    prev = line;
    line = line
      .replace(/\[\[[^\]]*\]\]/g, "")
      .replace(/\(\([^)]*\)\)/g, "")
      .replace(/\[\([^)]*\)\]/g, "")
      .replace(/\{\{[^}]*\}\}/g, "")
      .replace(/\[[^\][]*\]/g, "")
      .replace(/\([^()]*\)/g, "")
      .replace(/\{[^{}]*\}/g, "")
      .replace(/>[^\]]*\]/g, "") // asymmetric >text]
      .replace(/:::[A-Za-z0-9_]+/g, ""); // class assignment
  } while (line !== prev);
  return line;
}

// Parse edges into (src,dst) pairs by normalizing every arrow form to a single
// token, then walking chained `A --> B --> C` segments. Good enough for degree
// stats, which is what drives the structural classification.
function parseEdges(lines) {
  const edges = [];
  const nodes = new Set();
  for (let raw of lines) {
    if (/^(flowchart|graph)\b/i.test(raw)) continue;
    if (/^(subgraph|end\b|classDef|class\s|click|style|direction|linkStyle|%%)/i.test(raw)) continue;
    let line = stripLabels(raw);
    line = line.replace(/\|[^|]*\|/g, " "); // edge labels |x|
    // `-- label -->` / `-. label .->` / `== label ==>` (label survived strip)
    line = line.replace(/[-.=]{2,}\s*[^-.=>&\n]*?\s*[-.=]{1,}>/g, " ~> ");
    line = line.replace(/[xo<][-.=]{2,}[^-.=>&\n]*?[-.=]{1,}[xo>]/g, " ~> ");
    // bare arrows / links
    line = line.replace(/[-.=]{2,}>/g, " ~> ");
    line = line.replace(/<[-.=]{2,}/g, " ~> ");
    line = line.replace(/[-.=]{3,}/g, " ~> "); // open link --- / ===
    if (!line.includes("~>")) {
      // declaration-only line: capture its node id
      const idm = raw.trim().match(/^([A-Za-z][\w]*)/);
      if (idm && !/^(flowchart|graph|subgraph|end|classDef|class|direction|style|linkStyle|click)$/i.test(idm[1])) nodes.add(idm[1]);
      continue;
    }
    const segs = line.split("~>").map((s) => s.trim()).filter(Boolean);
    const ids = segs.map((s) => {
      const m = s.match(/([A-Za-z][\w]*)\s*$/); // id closest to the arrow
      return m ? m[1] : null;
    });
    for (let i = 0; i < ids.length - 1; i++) {
      if (ids[i] && ids[i + 1]) {
        edges.push([ids[i], ids[i + 1]]);
        nodes.add(ids[i]);
        nodes.add(ids[i + 1]);
      }
    }
  }
  return { edges, nodes };
}

function classify(chart) {
  const norm = chart.replace(/\\n/g, "\n");
  const lines = norm.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";
  const typeMatch = first.match(/^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|erDiagram|timeline|mindmap|pie|gantt|journey|gitGraph|quadrantChart|requirementDiagram|C4Context|xychart(?:-beta)?|block(?:-beta)?|sankey(?:-beta)?)\b/i);
  const type = typeMatch ? typeMatch[1] : first.split(/\s+/)[0] || "unknown";
  const dirMatch = first.match(/\b(LR|RL|TB|TD|BT)\b/);
  const direction = dirMatch ? dirMatch[1] : "";

  const isTimeline = /^timeline\b/i.test(first);
  const isStructural = /^(sequenceDiagram|classDiagram|stateDiagram|erDiagram|mindmap|pie|gantt|journey|gitGraph|quadrantChart|requirementDiagram|C4|xychart|sankey)/i.test(type);
  const isFlow = /^(flowchart|graph)/i.test(type);

  const { edges, nodes } = parseEdges(lines);
  const nodeCount = nodes.size;
  const edgeCount = edges.length;
  const subgraphs = (norm.match(/^\s*subgraph\b/gim) || []).length;
  const hasClassDef = /classDef/.test(norm);
  const maxLineLen = Math.max(0, ...lines.map((l) => l.length));

  // Degrees
  const outDeg = new Map();
  const inDeg = new Map();
  for (const [s, d] of edges) {
    outDeg.set(s, (outDeg.get(s) || 0) + 1);
    inDeg.set(d, (inDeg.get(d) || 0) + 1);
  }
  const maxOut = Math.max(0, ...outDeg.values());
  const maxIn = Math.max(0, ...inDeg.values());

  // Cycle detection (DFS), a back-edge means a decision/loop flow (keep).
  const adj = new Map();
  for (const [s, d] of edges) {
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s).push(d);
  }
  let hasCycle = false;
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map([...nodes].map((n) => [n, WHITE]));
  const dfs = (u) => {
    color.set(u, GRAY);
    for (const v of adj.get(u) || []) {
      if (color.get(v) === GRAY) { hasCycle = true; return; }
      if (color.get(v) === WHITE) dfs(v);
    }
    color.set(u, BLACK);
  };
  for (const n of nodes) if (color.get(n) === WHITE) dfs(n);

  // Longest path (DAG) → horizontal extent in LR, vertical extent in TD.
  let longestPath = nodeCount > 0 ? 1 : 0;
  if (!hasCycle && edgeCount > 0) {
    const memo = new Map();
    const dp = (u) => {
      if (memo.has(u)) return memo.get(u);
      let best = 1;
      for (const v of adj.get(u) || []) best = Math.max(best, 1 + dp(v));
      memo.set(u, best);
      return best;
    };
    for (const n of nodes) longestPath = Math.max(longestPath, dp(n));
  }

  // Structural shape of the flow graph
  const isPath = isFlow && edgeCount > 0 && maxOut <= 1 && maxIn <= 1 && !hasCycle; // a chain
  const isTree = isFlow && maxOut >= 2 && maxIn <= 1 && !hasCycle; // branches out
  const isMerge = isFlow && maxIn >= 2; // converges (split-apply-combine etc.)
  const noEdges = isFlow && edgeCount === 0;

  // Width proxies. Side-by-side subgraphs each widen the layout; a long LR
  // chain or a big TD fan-out also do.
  const horiz =
    direction === "LR" || direction === "RL"
      ? longestPath
      : Math.max(maxOut, subgraphs >= 2 ? subgraphs : 0);
  const subgraphWidth = subgraphs >= 2 ? subgraphs : 0;

  // ── Flags ──────────────────────────────────────────────────────────────
  let flag = "ok";
  if (isTimeline) flag = "timeline-skip";
  else if (isStructural) flag = "structural-ok";
  else if (noEdges && nodeCount >= 4) flag = "TABLE-LIKE";
  else if (isPath && nodeCount >= 6) flag = "LONG-PATH"; // redundant linear chain
  else if (isPath && nodeCount >= 3) flag = "short-path";
  // wide: long horizontal chain, big fan, or ≥2 side-by-side subgraph columns
  else if ((direction === "LR" || direction === "RL") && longestPath >= 6) flag = "WIDE-CHAIN";
  else if (maxOut >= 6) flag = "WIDE-FANOUT";
  else if (subgraphWidth >= 3) flag = "WIDE-SUBGRAPHS";
  else if (isTree || isMerge) flag = "branchy-ok";

  return {
    type, direction, nodeCount, edgeCount, subgraphs, hasClassDef,
    maxLineLen, lineCount: lines.length,
    maxOut, maxIn, hasCycle, longestPath, horiz,
    isPath, isTree, isMerge, noEdges, flag,
  };
}

const files = walk(ROOT).sort();
const rows = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  const blocks = extractBlocks(text);
  for (const b of blocks) {
    const c = classify(b.text);
    rows.push({ file: f, line: b.startLine, ...c, chart: b.text });
  }
}

// Summary
const byFlag = {};
const byType = {};
for (const r of rows) {
  byFlag[r.flag] = (byFlag[r.flag] || 0) + 1;
  byType[r.type] = (byType[r.type] || 0) + 1;
}

const mode = process.argv[2] || "summary";
if (mode === "summary") {
  console.log("TOTAL BLOCKS:", rows.length);
  console.log("\nBY FLAG:");
  for (const [k, v] of Object.entries(byFlag).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(16)} ${v}`);
  console.log("\nBY TYPE:");
  for (const [k, v] of Object.entries(byType).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${v}`);
  console.log("\nBY COURSE (actionable = TABLE-LIKE|LONG-PATH|WIDE-*):");
  const ACTION = ["TABLE-LIKE", "LONG-PATH", "WIDE-CHAIN", "WIDE-FANOUT", "WIDE-SUBGRAPHS"];
  const byCourse = {};
  for (const r of rows) {
    const course = r.file.split("/")[2];
    byCourse[course] = byCourse[course] || { total: 0, flagged: 0 };
    byCourse[course].total++;
    if (ACTION.includes(r.flag)) byCourse[course].flagged++;
  }
  for (const [k, v] of Object.entries(byCourse).sort((a, b) => b[1].flagged - a[1].flagged)) {
    if (v.flagged > 0) console.log(`  ${k.padEnd(40)} actionable ${String(v.flagged).padStart(3)} / ${v.total}`);
  }
} else if (mode === "json") {
  // Dump flagged rows (no chart text) for triage.
  const flagged = rows.filter((r) => ["TABLE-LIKE", "LONG-LINEAR", "WIDE", "TALL"].includes(r.flag));
  console.log(JSON.stringify(flagged.map(({ chart, ...r }) => r), null, 2));
} else if (mode === "list") {
  const want = process.argv[3];
  for (const r of rows) {
    if (want && r.flag !== want) continue;
    if (!want && r.flag === "ok") continue;
    console.log(`${r.flag.padEnd(14)} ${r.type.padEnd(10)} n=${String(r.nodeCount).padStart(2)} e=${String(r.edgeOps).padStart(2)} ${r.file}:${r.line}`);
  }
} else if (mode === "dump") {
  const want = process.argv[3];
  const limit = Number(process.argv[4] || 8);
  const course = process.argv[5];
  let shown = 0;
  for (const r of rows) {
    if (r.flag !== want) continue;
    if (course && !r.file.includes(course)) continue;
    if (shown++ >= limit) break;
    console.log(`\n━━━ ${r.flag} | ${r.type} ${r.direction} n=${r.nodeCount} e=${r.edgeOps} sg=${r.subgraphs} | ${r.file}:${r.line}`);
    console.log(r.chart);
  }
} else if (mode === "file") {
  const want = process.argv[3];
  for (const r of rows) {
    if (!r.file.includes(want)) continue;
    console.log(`\n━━━ ${r.flag} | ${r.type} ${r.direction} n=${r.nodeCount} e=${r.edgeCount} | ${r.file}:${r.line}`);
    console.log(r.chart);
  }
} else if (mode === "course") {
  // Actionable worklist for one course: file:line, flag, stats, chart text.
  const want = process.argv[3];
  const ACTION = ["TABLE-LIKE", "LONG-PATH", "WIDE-CHAIN", "WIDE-FANOUT", "WIDE-SUBGRAPHS"];
  let n = 0;
  for (const r of rows) {
    if (!r.file.includes(want)) continue;
    if (!ACTION.includes(r.flag)) continue;
    n++;
    console.log(`\n━━━ #${n} ${r.flag} | ${r.type} ${r.direction} nodes=${r.nodeCount} edges=${r.edgeCount} maxOut=${r.maxOut} maxIn=${r.maxIn} subgraphs=${r.subgraphs} longestPath=${r.longestPath}`);
    console.log(`FILE: ${r.file}:${r.line}`);
    console.log("```mermaid");
    console.log(r.chart);
    console.log("```");
  }
  console.log(`\nTOTAL actionable in ${want}: ${n}`);
}
