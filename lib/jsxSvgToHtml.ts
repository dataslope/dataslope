/**
 * Rewrite a hand-authored JSX `<svg>…</svg>` source slice into valid SVG
 * markup that a browser can render directly (via `dangerouslySetInnerHTML`).
 *
 * The lesson SVGs are written as JSX, which differs from raw SVG in two ways
 * this module reverses:
 *   1. `style={{ … }}` object literals  → `style="…"` declaration strings
 *   2. camelCase presentation attributes → hyphenated names (fillOpacity →
 *      fill-opacity, fontSize → font-size, …)
 * Attributes whose casing is significant in SVG (viewBox, preserveAspectRatio)
 * are left untouched.
 *
 * Kept dependency-free and separate from `lib/svgGallery.ts` (which reaches
 * into the Fumadocs `source`) so the conversion can be unit-tested in
 * isolation.
 */

// camelCase (JSX) → hyphenated (SVG) presentation-attribute names. Names absent
// here (viewBox, preserveAspectRatio, gradientUnits, …) pass through unchanged.
const ATTR_MAP: Record<string, string> = {
  fillOpacity: "fill-opacity",
  fillRule: "fill-rule",
  strokeWidth: "stroke-width",
  strokeLinecap: "stroke-linecap",
  strokeLinejoin: "stroke-linejoin",
  strokeOpacity: "stroke-opacity",
  strokeDasharray: "stroke-dasharray",
  strokeDashoffset: "stroke-dashoffset",
  strokeMiterlimit: "stroke-miterlimit",
  clipRule: "clip-rule",
  clipPath: "clip-path",
  fontSize: "font-size",
  fontFamily: "font-family",
  fontWeight: "font-weight",
  fontStyle: "font-style",
  textAnchor: "text-anchor",
  letterSpacing: "letter-spacing",
  dominantBaseline: "dominant-baseline",
  stopColor: "stop-color",
  stopOpacity: "stop-opacity",
  vectorEffect: "vector-effect",
  paintOrder: "paint-order",
  markerEnd: "marker-end",
  markerStart: "marker-start",
  markerMid: "marker-mid",
};

function camelToKebab(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

// Convert the body of a JSX `style={{ … }}` object literal into a CSS
// declaration string. Values are string literals in these SVGs (e.g. "block",
// "100%", "var(--ds-blue-500)"); a quote- and bracket-aware split keeps any
// value that contains a comma (e.g. a font stack) intact.
function styleObjectToCss(inner: string): string {
  const parts: string[] = [];
  let cur = "";
  let depth = 0;
  let quote = "";
  for (const c of inner) {
    if (quote) {
      cur += c;
      if (c === quote) quote = "";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      cur += c;
      continue;
    }
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") depth--;
    else if (c === "," && depth === 0) {
      parts.push(cur);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.trim()) parts.push(cur);

  const decls: string[] = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim().replace(/^['"`]|['"`]$/g, "");
    let val = part.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith("`") && val.endsWith("`"))
    ) {
      val = val.slice(1, -1);
    }
    if (!key || !val) continue;
    decls.push(`${camelToKebab(key)}: ${val}`);
  }
  return decls.join("; ");
}

// Rewrite every `style={{ … }}` attribute to `style="…"`. The inner object
// never nests a `}}` (these graphics contain no expressions), so the first
// `}}` after each `style={{` reliably closes it.
function inlineStyleObjects(src: string): string {
  const OPEN = "style={{";
  let out = "";
  let i = 0;
  for (;;) {
    const at = src.indexOf(OPEN, i);
    if (at < 0) {
      out += src.slice(i);
      break;
    }
    out += src.slice(i, at);
    const innerStart = at + OPEN.length;
    const close = src.indexOf("}}", innerStart);
    if (close < 0) {
      out += src.slice(at);
      break;
    }
    out += `style="${styleObjectToCss(src.slice(innerStart, close))}"`;
    i = close + 2;
  }
  return out;
}

/** Rewrite an authored JSX `<svg>…</svg>` source slice into valid SVG markup. */
export function jsxSvgToHtml(src: string): string {
  let out = inlineStyleObjects(src);
  // Rename camelCase presentation attributes (fillOpacity → fill-opacity, …).
  // Matches a bare `name=` token; these JSX-only spellings don't occur inside
  // the quoted prose of aria-labels, so quoted text is left untouched.
  out = out.replace(/\b([A-Za-z][A-Za-z0-9]*)=/g, (m, name: string) =>
    ATTR_MAP[name] ? `${ATTR_MAP[name]}=` : m,
  );
  return out.replace(/\bclassName=/g, "class=");
}
