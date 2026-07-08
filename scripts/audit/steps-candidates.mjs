#!/usr/bin/env node
// One-off audit: find mermaid blocks that are really an ORDERED SEQUENCE OF
// STEPS drawn as boxes, the case the Fumadocs <Steps> component renders better
// than a diagram. The signal is a *linear* flowchart (a simple A→B→C path, no
// branches/merges/cycles) whose node labels are *numbered* ("1.", "Step 2",
// "Phase 3", …). Spatial/structural diagrams (memory layouts, call stacks, JOIN
// maps) are linear too but are NOT sequences, so numbering is what separates
// them. Not part of the build.
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

function extractBlocks(text) {
  const lines = text.split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    if (/^(\s*)```mermaid\s*$/.test(lines[i])) {
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

// Pull the human label out of a node declaration: A["1. Foo"], A[1. Foo],
// A(1. Foo), A{1. Foo}. We first scrub arrow operators, `<br>` tags and edge
// labels (|x|) so they don't get mistaken for node delimiters, then grab the
// text inside each bracket pair.
function labelsOn(rawLine) {
  const line = rawLine
    .replace(/<br\s*\/?>/gi, " ") // line breaks → space
    .replace(/\|[^|]*\|/g, " ") // edge labels |x|
    .replace(/[xo<]?[-.=]{2,}>?/g, " ") // arrows / links --> -.- ==>
    .replace(/:::[A-Za-z0-9_]+/g, ""); // class assignment
  const out = [];
  const re = /(?:\[\[|\[\(|\[|\(\(|\(|\{\{|\{)\s*("?)(.*?)\1\s*(?:\]\]|\)\]|\]|\)\)|\)|\}\}|\})/g;
  let m;
  while ((m = re.exec(line))) {
    const t = m[2].trim();
    if (t) out.push(t);
  }
  return out;
}

// Is this a flowchart whose nodes are numbered steps?
function analyze(chart) {
  const norm = chart.replace(/\\n/g, "\n");
  const lines = norm.split("\n").map((l) => l.trim()).filter(Boolean);
  const first = lines[0] || "";
  if (!/^(flowchart|graph)\b/i.test(first)) return null;

  // No subgraphs, those are almost always spatial groupings, not step lists.
  if (/^\s*subgraph\b/im.test(norm)) return { numbered: false, hasSubgraph: true, labels: [] };

  const labels = [];
  for (const l of lines) {
    if (/^(flowchart|graph|classDef|class\s|click|style|linkStyle|direction|%%)/i.test(l)) continue;
    labels.push(...labelsOn(l));
  }
  if (labels.length === 0) return { numbered: false, hasSubgraph: false, labels: [] };

  // A label counts as "numbered" if it starts with 1./2)/Step 3/Phase 4 etc.
  // (but NOT "0:50" index:value pairs, require the separator to be . ) : - and
  // be followed by a letter/space, not another digit run that looks like data).
  const numRe = /^(?:(?:step|phase|stage|part)\s*)?\d+\s*[\.\)\-–]\s*\D/i;
  const numbered = labels.filter((t) => numRe.test(t));
  // Require at least 3 numbered labels and that they dominate (≥ half), a real
  // ordered list, tolerant of a leading "You are here" / trailing node.
  const isSeq = numbered.length >= 3 && numbered.length * 2 >= labels.length;

  return {
    numbered: isSeq,
    hasSubgraph: false,
    count: labels.length,
    numCount: numbered.length,
    labels,
  };
}

const files = walk(ROOT).sort();
const hits = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const b of extractBlocks(text)) {
    const a = analyze(b.text);
    if (a && a.numbered) hits.push({ file: f, line: b.startLine, ...a, chart: b.text });
  }
}

console.log(`NUMBERED-SEQUENCE flowcharts: ${hits.length}\n`);
for (const h of hits) {
  console.log(`━━━ ${h.file}:${h.line}  (${h.numCount}/${h.count} numbered)`);
  console.log(h.chart);
  console.log();
}
