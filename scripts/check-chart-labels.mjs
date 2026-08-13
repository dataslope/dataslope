#!/usr/bin/env node
/**
 * Fail on a chart with one label printed on top of another.
 *
 * The collision that prompted this is structural rather than careless, and it
 * is invisible in the spec. Plot lays the band above a faceted frame out for
 * its own 10px default: the facet title's baseline 9px up, the topmost y tick
 * label centred *on* the frame edge. This theme renders at 13px, because an
 * inline `font-size` on the root beats Plot's presentation attribute, so
 * everything in that band grows by a third and the air between the two rows of
 * type goes to nothing. `line-vs-bar-four-cases` shipped with its panel notes
 * inside its facet titles. `_theme.mjs` now lifts the titles when the topmost
 * tick lands on the frame edge; this catches whatever that does not.
 *
 * Six more were found the same way, all of them a label written at a round
 * position that happened to be a tick row: a note at `y: 3` on an axis whose
 * ticks are at 0, two series labels nudged toward each other rather than
 * apart, an annotation hanging off the left edge of a panel and running back
 * into the margin.
 *
 * ── What it can and cannot see ─────────────────────────────────────────────
 *
 * Advance widths are estimated per character, because there is no font here
 * and the page's Inter is not one this process could load. The estimate is
 * deliberately narrow and `MIN_OVERLAP` absorbs the rest, so this reports
 * labels that are genuinely on top of each other rather than merely close.
 * Rotated labels are skipped: an axis-aligned box is the wrong shape for one,
 * and Plot rotates axis labels precisely when they would otherwise collide.
 *
 * `--rules` adds a second pass for labels with a rule through them, which is
 * what `HALO` in `_theme.mjs` exists to fix. It is not on by default and does
 * not fail the build, because it cannot see that a label sits on an opaque
 * mark: every cell label in a heatmap and every letter inside a plotted dot
 * comes back as a hit. It found a real one in `ci-coverage`, so it is worth
 * reading occasionally; it is not worth blocking on.
 *
 * Usage:
 *   node scripts/check-chart-labels.mjs [--verbose] [--rules]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CHARTS = join(ROOT, "lib", "generated", "charts.js");

/** How deep two label boxes must interpenetrate before it counts. The widths
 *  here are estimated, so a hairline of overlap is inside the error bars; two
 *  points of it is a label sitting on another label. `line-vs-bar-four-cases`
 *  shipped with a panel note 2.2px inside its facet title, which is the case
 *  this number is set by. */
const MIN_OVERLAP = 2;
/** How far inside a label's box a rule must pass to count as through it. */
const RULE_INSET = 2;

/** The root style sets 13px, which wins over Plot's `font-size` attribute. */
const BASE_FONT_SIZE = 13;

// Per-character advance as a fraction of the em, close enough to Inter for a
// collision test. Anything not listed takes DEFAULT_ADVANCE.
const DEFAULT_ADVANCE = 0.55;
const ADVANCE = new Map(
  Object.entries({
    " ": 0.26, "!": 0.29, '"': 0.4, "'": 0.22, "(": 0.34, ")": 0.34, ",": 0.27,
    ".": 0.27, ":": 0.27, ";": 0.27, "-": 0.36, "–": 0.5, "|": 0.26,
    f: 0.35, i: 0.26, j: 0.26, l: 0.26, r: 0.37, t: 0.34, I: 0.3,
    m: 0.85, w: 0.72, M: 0.86, W: 0.86, "%": 0.85, "@": 0.95,
  }),
);
/** The theme tracks labels slightly tight. */
const TRACKING = -0.011;

function textWidth(text, fontSize, bold) {
  let em = 0;
  for (const ch of text) em += (ADVANCE.get(ch) ?? DEFAULT_ADVANCE) + TRACKING;
  return em * fontSize * (bold ? 1.03 : 1);
}

/** Cap-and-ascender height above the baseline, and descender below it. The
 *  descent is per string rather than per font: a label reading "78" or "n =
 *  10,000" has nothing below the baseline, and charging it a full descender
 *  is what made a big numeral appear to collide with the note under it. */
const ASCENT = 0.74;
const DESCENT = 0.22;
const FLAT = 0.06;
const DESCENDERS = /[gjpqyQ()[\]{}_$@]/;

const NUM = "[-\\d.e]+";
const attrOf = (attrs, key) => new RegExp(`\\b${key}="([^"]*)"`).exec(attrs)?.[1];
// `transform="translate(82,60) rotate(-40)"` is one attribute with two
// operations in it, so the translate cannot be matched up to the closing
// quote: js-equality-grid's rotated column headers were read at the origin,
// where they collided with everything.
const translateOf = (attrs) => {
  const m = new RegExp(`translate\\(\\s*(${NUM})[,\\s]+(${NUM})\\s*\\)`).exec(
    attrOf(attrs, "transform") ?? "",
  );
  return m ? [Number(m[1]), Number(m[2])] : [0, 0];
};
/** Rotated labels are skipped: an axis-aligned box is the wrong shape for one,
 *  and Plot rotates axis labels precisely when they would otherwise collide. */
const isRotated = (attrs) => /rotate\(/.test(attrOf(attrs, "transform") ?? "");
/** `0.32em` / `-0.24em` / `4` → px, against the element's own font size. */
const lengthOf = (value, fontSize) => {
  if (value == null) return 0;
  return value.endsWith("em") ? Number.parseFloat(value) * fontSize : Number.parseFloat(value) || 0;
};

/**
 * Every label box and every `<line>` segment in one chart, in SVG coordinates.
 *
 * One pass over the tag stream, carrying the inherited state a `<text>` needs:
 * the accumulated translate, the font size and weight, the anchor, and whether
 * an ancestor set the halo's stroke.
 */
export function readLabels(svg) {
  const boxes = [];
  const lines = [];
  const stack = [
    { tx: 0, ty: 0, fontSize: BASE_FONT_SIZE, bold: false, anchor: "middle", halo: false },
  ];

  for (const match of svg.matchAll(/<(\/?)([a-zA-Z]+)([^>]*?)(\/?)>([^<]*)/g)) {
    const [, closing, name, attrs, selfClosing, tail] = match;
    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }
    const parent = stack[stack.length - 1];
    const [dx, dy] = translateOf(attrs);
    const weight = attrOf(attrs, "font-weight");
    const size = attrOf(attrs, "font-size");
    const state = {
      tx: parent.tx + dx,
      ty: parent.ty + dy,
      // A `font-size` attribute on a group is honored; the root's is not,
      // because the root also carries an inline style that overrides it.
      fontSize: size && stack.length > 1 ? Number.parseFloat(size) : parent.fontSize,
      bold: weight ? Number(weight) >= 600 : parent.bold,
      anchor: attrOf(attrs, "text-anchor") ?? parent.anchor,
      halo: parent.halo || attrs.includes("paint-order=") || attrs.includes("stroke-width=\"4\""),
    };

    if (name === "line") {
      const n = (key) => Number(attrOf(attrs, key) ?? 0);
      lines.push({
        x1: state.tx + n("x1"),
        y1: state.ty + n("y1"),
        x2: state.tx + n("x2"),
        y2: state.ty + n("y2"),
      });
    }

    // A self-closing `<text/>` is an axis tick Plot chose not to label. It has
    // no content, and scanning forward for a `</text>` would find the *next*
    // label's and read its lines in at this tick's position.
    if (name === "text" && !selfClosing && !isRotated(attrs)) {
      // The element's own content, or its `<tspan>` children for a multi-line
      // label. Plot writes the first line's offset as `y` and the rest as
      // `dy`, both in em, so they accumulate.
      const body = svg.slice(match.index + match[0].length - tail.length);
      const end = body.indexOf("</text>");
      const inner = tail + (end === -1 ? "" : body.slice(0, end));
      const spans = [...inner.matchAll(/<tspan([^>]*)>([^<]*)<\/tspan>/g)];
      const rows = spans.length
        ? spans.map((s) => ({ attrs: s[1], text: s[2] }))
        : [{ attrs, text: tail }];

      let baseline = state.ty;
      let first = true;
      for (const row of rows) {
        const y = attrOf(row.attrs, "y");
        const shift = attrOf(row.attrs, "dy");
        if (shift != null) baseline += lengthOf(shift, state.fontSize);
        else if (y != null && first) baseline = state.ty + lengthOf(y, state.fontSize);
        else if (y != null) baseline = state.ty + lengthOf(y, state.fontSize);
        first = false;
        const text = row.text.trim();
        if (!text) continue;
        const width = textWidth(text, state.fontSize, state.bold);
        const anchor = attrOf(row.attrs, "text-anchor") ?? state.anchor;
        const cx = state.tx + lengthOf(attrOf(row.attrs, "x"), state.fontSize);
        const x0 = anchor === "end" ? cx - width : anchor === "start" ? cx : cx - width / 2;
        const descent = DESCENDERS.test(text) ? DESCENT : FLAT;
        boxes.push({
          text,
          halo: state.halo,
          x0,
          x1: x0 + width,
          y0: baseline - ASCENT * state.fontSize,
          y1: baseline + descent * state.fontSize,
        });
      }
    }
    if (!selfClosing) stack.push(state);
  }
  return { boxes, lines };
}

const overlap = (a, b) =>
  Math.min(
    Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0),
    Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0),
  );

/** A rule that passes through a box, rather than along its edge. Only the
 *  horizontal and vertical cases, which is every `<line>` Plot emits here. */
function crosses(line, box) {
  const inset = (v, lo, hi) => v > lo + RULE_INSET && v < hi - RULE_INSET;
  if (line.y1 === line.y2) {
    return (
      inset(line.y1, box.y0, box.y1) &&
      Math.min(line.x1, line.x2) < box.x1 - RULE_INSET &&
      Math.max(line.x1, line.x2) > box.x0 + RULE_INSET
    );
  }
  if (line.x1 === line.x2) {
    return (
      inset(line.x1, box.x0, box.x1) &&
      Math.min(line.y1, line.y2) < box.y1 - RULE_INSET &&
      Math.max(line.y1, line.y2) > box.y0 + RULE_INSET
    );
  }
  return false;
}

/**
 * Charts where labels overlap on purpose, and the reason. A chart whose
 * subject is crowding has to be allowed to be crowded.
 */
const CROWDED_ON_PURPOSE = new Map([
  [
    "hover-is-the-detail-layer",
    "the left panel prints every value at once, which is the thing it is arguing against",
  ],
]);

export function labelProblems(svg, { rules = false } = {}) {
  const { boxes, lines } = readLabels(svg);
  const problems = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const deep = overlap(boxes[i], boxes[j]);
      if (deep > MIN_OVERLAP) {
        problems.push({
          kind: "label over label",
          detail: `"${boxes[i].text}" / "${boxes[j].text}" overlap by ${deep.toFixed(1)}px`,
        });
      }
    }
    if (!rules || boxes[i].halo) continue;
    for (const line of lines) {
      if (!crosses(line, boxes[i])) continue;
      problems.push({
        kind: "rule through an unhaloed label",
        detail: `"${boxes[i].text}" (spread ...HALO into the mark, or move it)`,
      });
      break;
    }
  }
  return problems;
}

async function main() {
  const verbose = process.argv.includes("--verbose");
  const rules = process.argv.includes("--rules");
  if (!existsSync(CHARTS)) {
    console.error(`✗ ${CHARTS} is missing. Run: node scripts/build-charts.mjs`);
    process.exit(1);
  }
  const charts = (await import(pathToFileURL(CHARTS).href)).default;

  const bad = [];
  for (const [slug, entry] of Object.entries(charts)) {
    if (CROWDED_ON_PURPOSE.has(slug)) {
      if (verbose) console.log(`  allowed  ${slug}: ${CROWDED_ON_PURPOSE.get(slug)}`);
      continue;
    }
    const problems = labelProblems(entry.svg, { rules });
    if (problems.length) bad.push([slug, problems]);
    else if (verbose) console.log(`  ok  ${slug}`);
  }

  const count = Object.keys(charts).length;
  if (!bad.length) {
    console.log(`✓ ${count} chart(s): no label sits on another label`);
    return;
  }
  console.error(`✗ ${bad.length} of ${count} chart(s) have colliding labels:\n`);
  for (const [slug, problems] of bad) {
    console.error(`  ${slug}`);
    for (const p of problems.slice(0, 4)) console.error(`    ${p.kind}: ${p.detail}`);
    if (problems.length > 4) console.error(`    ...and ${problems.length - 4} more`);
  }
  console.error(
    "\nA label sitting over the data takes ...HALO from charts/_theme.mjs. Two labels\n" +
      "on top of each other have to move: a facet title colliding with the topmost y\n" +
      "tick means the tick is on the domain maximum, and no margin can separate them.",
  );
  process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) await main();
