// Shared machinery for the live-page-preview adapters (web, react).
// User code runs in a sandboxed `<iframe srcdoc>` with a bare opaque
// origin; `sandbox` must NEVER include `allow-same-origin` (the HTML spec
// warns that with allow-scripts it lets the frame remove its own sandbox).
// An injected bridge forwards console/error output to the parent via
// postMessage, authenticated by a per-run random token (opaque-origin
// frames can't be targeted by origin, so targetOrigin is "*"). Each run
// replaces the host's iframe, so a frozen document never freezes the app.

import type { EmitOutput } from "../types";
import { HARNESS_BEGIN } from "../challengeHarness";
import { TAILWIND_BROWSER_CDN } from "./cdn";
import {
  PREVIEW_CONSOLE_SOURCE,
  PREVIEW_STORAGE_SHIM_SOURCE,
} from "./previewConsoleSource";

/** Stamped on every bridge message to match it to its run. */
export const PREVIEW_MESSAGE_KEY = "__dsWebPreview__";

/** Stamped on a message *into* the frame to ask the bridge to re-post
 *  everything sent so far — how a late subscriber sees a server-rendered
 *  frame's early output. */
export const PREVIEW_REPLAY_KEY = "__dsWebPreviewReplay__";

/** Class applied to preview iframes for surface styling. */
export const PREVIEW_IFRAME_CLASS = "ds-web-preview-frame";

/** Sandbox grants. `allow-same-origin` is deliberately absent (see module docs). */
export const PREVIEW_SANDBOX = "allow-scripts allow-modals allow-forms";

/** Wait after `load` before resolving a non-harness run. Console output
 *  keeps forwarding afterwards via the live-listener registry below. */
const LOADED_SETTLE_MS = 150;
/** Deadline for a document that never signals `load` (e.g. infinite loop). */
const LOAD_DEADLINE_MS = 10_000;
/** Deadline for a challenge run to deliver its harness-done signal. */
const HARNESS_DEADLINE_MS = 20_000;

export type PreviewConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export type PreviewMessage =
  | { t: "console"; level: PreviewConsoleLevel; text: string }
  | {
      t: "error";
      text: string;
      /** Raw position in the composed document, when the frame had one. */
      line?: number;
      column?: number;
      /** True when the frame already appended a source location. */
      located?: boolean;
    }
  | { t: "clear" }
  | { t: "loaded" }
  | { t: "harness-done" };

/** New unguessable-enough token for one preview run. */
export function newPreviewToken(): string {
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** True when `source` contains a challenge harness — the runner then waits
 *  for the harness-done signal instead of resolving at document load. */
export function hasHarnessMarker(source: string): boolean {
  return source.includes(HARNESS_BEGIN);
}

/** Inline script/style payloads must not terminate their host tag
 *  early. The `<\/` escape is a no-op in JS strings and regex-free CSS,
 *  so the transformed code still parses identically. */
export function escapeInlineScriptContent(code: string): string {
  return code.replace(/<\/(script)/gi, "<\\/$1");
}

export function escapeInlineStyleContent(css: string): string {
  return css.replace(/<\/(style)/gi, "<\\/$1");
}

/** One run of composed lines that came from a single editor file. */
export interface SourceLineRange {
  /** File as the reader knows it: "script.js", "App.tsx". */
  file: string;
  /** First composed line of the run, 1-based. */
  from: number;
  /** Last composed line of the run, 1-based, inclusive. */
  to: number;
  /** Line of `file` that `from` corresponds to, 1-based. */
  at: number;
}

/** Lines a string occupies when it is spliced into a document. */
function lineCount(text: string): number {
  return text.split("\n").length;
}

/** Opening tag of a block the composer built out of a workspace file. */
const COMPOSED_BLOCK_RE =
  /<(?:script|style)\b[^>]*\bdata-(?:inlined|injected)-from="([^"]+)"[^>]*>/i;

/**
 * Which editor file each line of a composed document came from.
 *
 * The composer stamps `data-source-lines` (and, for a `defer` wrapper,
 * `data-source-offset`) on every block it builds out of a workspace file,
 * so the extents are read off the document rather than guessed. Lines that
 * belong to no such block are the entry file's own, counted around the
 * blocks: an inlined `<script src>` replaces the tag's line or lines with
 * the file's contents, so the entry's own numbering resumes past them.
 */
export function buildSourceLineMap(
  composed: string,
  entryFile: string,
  /** Entry lines each inlined tag replaced, in document order per file. */
  consumedByFile: Map<string, number[]>,
): SourceLineRange[] {
  const pending = new Map<string, number[]>();
  for (const [file, counts] of consumedByFile) pending.set(file, [...counts]);

  const lines = composed.split("\n");
  const ranges: SourceLineRange[] = [];
  let entryAt = 1; // next unconsumed line of the entry file
  let entryFrom = 1; // composed line where the current entry run started
  let i = 0;

  const closeEntryRun = (endLine: number) => {
    if (endLine < entryFrom) return;
    ranges.push({
      file: entryFile,
      from: entryFrom,
      to: endLine,
      at: entryAt,
    });
    entryAt += endLine - entryFrom + 1;
  };

  while (i < lines.length) {
    const match = lines[i].match(COMPOSED_BLOCK_RE);
    if (!match) {
      i += 1;
      continue;
    }
    const tag = match[0];
    const file = match[1];
    const length = Number(getAttr(tag, "data-source-lines") ?? "0");
    const offset = Number(getAttr(tag, "data-source-offset") ?? "0");
    const tagLine = i + 1; // 1-based
    closeEntryRun(tagLine - 1);
    if (length > 0) {
      ranges.push({
        file,
        from: tagLine + 1 + offset,
        to: tagLine + offset + length,
        at: 1,
      });
    }
    // An inlined block replaced the entry lines its tag occupied; an
    // injected one was appended and replaced nothing.
    const queue = pending.get(file);
    entryAt += queue && queue.length > 0 ? queue.shift()! : 0;
    // Resume entry numbering after the block and its closing tag.
    i = tagLine + offset + length + 1;
    entryFrom = i + 1;
  }
  closeEntryRun(lines.length);
  return ranges.filter((r) => r.to >= r.from);
}

/**
 * Bridge script injected at the top of every preview document, before any
 * user code. Console args are serialized to final strings inside the iframe
 * so nothing structured-clone-unfriendly hits postMessage.
 */
export function buildPreviewBridge(
  token: string,
  sourceMap: SourceLineRange[] = [],
): string {
  // ES5-flavoured on purpose: runs inside arbitrary learner documents,
  // including quirks-mode ones.
  const js = `
(function () {
  "use strict";
  var KEY = ${JSON.stringify(PREVIEW_MESSAGE_KEY)};
  var TOKEN = ${JSON.stringify(token)};
  var REPLAY = ${JSON.stringify(PREVIEW_REPLAY_KEY)};
  // Everything posted so far, so a parent that starts listening late can
  // ask for it. A run attaches its listener before the frame exists and
  // never needs this; the server-rendered auto-preview is the opposite —
  // its frame is in the initial HTML and starts running while the page's
  // JavaScript is still downloading, so by the time React hydrates and
  // subscribes, the block has usually already logged everything it will.
  // Without the replay those messages are simply lost, and the block
  // looks like one that prints nothing.
  var buffered = [];
  var MAX_BUFFERED = 200;
  var seq = 0;
  function post(msg) {
    msg[KEY] = TOKEN;
    // Sequence number so a subscriber can tell a replayed message from a
    // live one. postMessage structured-clones, so the replay arrives as
    // a different object with the same contents — identity can't dedupe
    // it, and comparing text would collapse a block that genuinely logs
    // the same line twice.
    msg.n = seq++;
    if (buffered.length < MAX_BUFFERED) buffered.push(msg);
    try { window.parent.postMessage(msg, "*"); } catch (e) { /* detached */ }
  }
  window.addEventListener("message", function (ev) {
    if (!ev.data || ev.data[REPLAY] !== TOKEN) return;
    for (var i = 0; i < buffered.length; i++) {
      try { window.parent.postMessage(buffered[i], "*"); } catch (e) { /* detached */ }
    }
  });
  // Runtime errors report a location inside the composed document, which
  // the reader never sees. SOURCES maps those lines back onto the files
  // open in the editor; see buildSourceLineMap.
  var SOURCES = ${JSON.stringify(sourceMap)};
  function locate(line, column) {
    for (var i = 0; i < SOURCES.length; i++) {
      var s = SOURCES[i];
      if (line >= s.from && line <= s.to) {
        var at = s.file + ":" + (line - s.from + s.at);
        return column ? at + ":" + column : at;
      }
    }
    return null;
  }
  // Stack frames name the composed document; rewrite each one in place so
  // a trace reads in the reader's own files.
  function mapLocations(text) {
    if (typeof text !== "string" || text.indexOf("about:srcdoc") === -1) return text;
    return text.replace(/about:srcdoc:(\\d+):(\\d+)/g, function (whole, line, column) {
      return locate(Number(line), Number(column)) || whole;
    });
  }
  function withLocation(text, line, column) {
    var where = typeof line === "number" && line > 0 ? locate(line, column) : null;
    if (where) return text + " (" + where + ")";
    // An error with no line at all (a cross-origin script, a
    // browser-internal throw) is better bare than falsely placed.
    return text;
  }
${PREVIEW_CONSOLE_SOURCE}
${PREVIEW_STORAGE_SHIM_SOURCE}
  window.addEventListener("error", function (ev) {
    // Resource errors (a module that would not load) arrive on the capture
    // path with the failing element as the target and no message at all.
    var target = ev.target;
    if (target && target !== window && target.nodeName) {
      var name = target.nodeName.toLowerCase();
      var url = target.src || target.href || "";
      var what = url
        ? name + " failed to load: " + url
        : "An inline " + name + " failed to load. If it imports a package, that import could not be fetched.";
      post({ t: "error", text: "Uncaught (load) " + what });
      showOverlay("Failed to load", what);
      return;
    }
    var text = ev.message || "Uncaught error";
    if (ev.error && ev.error.name && text.indexOf(ev.error.name) === -1) {
      text = ev.error.name + ": " + text;
    }
    var mapped = mapLocations(text);
    var located = withLocation(mapped, ev.lineno, ev.colno);
    // A document whose sources the composer could not map (the React
    // bundle) reports the raw position instead, for the parent to resolve
    // through the bundler's own source map.
    post({
      t: "error",
      text: located,
      line: ev.lineno,
      column: ev.colno,
      located: located !== mapped,
    });
    showOverlay("Uncaught error", located);
  }, true);
  window.addEventListener("unhandledrejection", function (ev) {
    var reason = ev.reason;
    // The prefix is the part that says "this is a missing await or
    // .catch()", not something that threw.
    var text = reason instanceof Error
      ? "Uncaught (in promise) " + (reason.name || "Error") + (reason.message ? ": " + reason.message : "")
      : "Uncaught (in promise) " + render(reason);
    post({ t: "error", text: mapLocations(text) });
  });
  // A blank preview is indistinguishable from broken CSS, a component that
  // returned null, and nothing having run at all. Every mainstream React
  // setup paints an overlay for exactly this reason; so does this one.
  var overlay = null;
  function showOverlay(title, detail) {
    try {
      if (!document.body) return;
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.setAttribute("data-ds-preview-error", "");
        overlay.style.cssText = [
          "position:fixed", "inset:0", "z-index:2147483647",
          "background:#1b1013", "color:#ffd9de", "overflow:auto",
          "padding:20px", "margin:0",
          "font:13px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
        ].join(";");
        document.body.appendChild(overlay);
      }
      var head = document.createElement("div");
      head.style.cssText = "font-weight:700;color:#ff9fae;margin-bottom:6px";
      head.textContent = title;
      var body = document.createElement("pre");
      body.style.cssText = "margin:0 0 14px;white-space:pre-wrap;word-break:break-word";
      body.textContent = detail;
      overlay.appendChild(head);
      overlay.appendChild(body);
    } catch (e) { /* a document too broken to paint on says it in the console */ }
  }
  window.__dsPreviewHarnessDone = function () { post({ t: "harness-done" }); };
  window.addEventListener("load", function () {
    setTimeout(function () { post({ t: "loaded" }); }, 0);
  });
})();
`;
  return `<script>${escapeInlineScriptContent(js)}</script>`;
}

/** `<script src>` tag for the pinned Tailwind in-browser compiler. */
export function tailwindScriptTag(): string {
  return `<script src="${TAILWIND_BROWSER_CDN}"></script>`;
}

// ─── Document composition (pure, unit-testable) ─────────────────────────

/** Strip `./` and leading `/` so hrefs match workspace-relative paths. */
function normalizeAssetPath(path: string): string {
  let p = path.trim();
  while (p.startsWith("./")) p = p.slice(2);
  if (p.startsWith("/")) p = p.slice(1);
  return p;
}

function getAttr(tag: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return m[2] ?? m[3] ?? m[4] ?? null;
}

function hasBareAttr(tag: string, name: string): boolean {
  return new RegExp(`\\b${name}(\\s|=|>|$)`, "i").test(tag);
}

const IMAGE_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  avif: "image/avif",
};

function mimeForFilename(filename: string): string | null {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return null;
  return IMAGE_MIME[filename.slice(dot + 1).toLowerCase()] ?? null;
}

/** Base64 for both browser (btoa) and Node (tests) without pulling in
 *  Buffer types. */
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  if (typeof btoa === "function") return btoa(binary);
  // Node fallback for unit tests.
  return (globalThis as unknown as { Buffer: { from(s: string, e: string): { toString(e: string): string } } })
    .Buffer.from(binary, "binary")
    .toString("base64");
}

/** Insert `snippet` as early as possible (after `<head>`, else `<html>`,
 *  else prepended) — the bridge must install before any user script logs. */
export function injectAtDocumentStart(html: string, snippet: string): string {
  const headMatch = html.match(/<head\b[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + snippet + html.slice(at);
  }
  const htmlMatch = html.match(/<html\b[^>]*>/i);
  if (htmlMatch && htmlMatch.index !== undefined) {
    const at = htmlMatch.index + htmlMatch[0].length;
    return html.slice(0, at) + snippet + html.slice(at);
  }
  return snippet + html;
}

export interface WebComposeInput {
  /** Entry document HTML (full document or fragment). May already carry a
   *  challenge harness `<script>`. */
  entryHtml: string;
  /** Per-run bridge token. Always required — every composed document
   *  carries the bridge. The server-rendered auto-preview derives its
   *  token from the block's content hash rather than randomness, so the
   *  server and browser renders stay identical (no hydration mismatch). */
  token: string;
  /** Workspace text files by relative path; `<link>`/`<script src>`
   *  references to these are inlined so the document is self-contained. */
  textFiles?: Map<string, string>;
  /** Binary files (uploads); `<img src>` references become data URIs. */
  binaryFiles?: Map<string, Uint8Array>;
  /** Inject the pinned Tailwind browser compiler before user code. */
  tailwind?: boolean;
  /** Name the entry document goes by in the editor, for error locations.
   *  Defaults to index.html. */
  entryFile?: string;
  /** Leave out the console bridge. For "Export page": the artifact a
   *  reader wants is the page they wrote, not the page plus the harness
   *  that watched it run. */
  omitBridge?: boolean;
}

/**
 * Compose the final srcdoc for an HTML/CSS/JS run. Workspace-relative
 * references are inlined (a srcdoc document has no base URL), and the
 * bridge (+ optional Tailwind) is injected at the top.
 *
 * CodePen-style implicit composition: unreferenced root-level `.css`/`.js`
 * files are appended after the markup (scripts see the parsed DOM);
 * explicitly referenced files inline at their tag and never double-apply.
 * Files inside folders stay opt-in so uploads don't execute by surprise.
 */
export function composeWebDocument(input: WebComposeInput): string {
  const textFiles = input.textFiles ?? new Map<string, string>();
  const binaryFiles = input.binaryFiles ?? new Map<string, Uint8Array>();
  let html = input.entryHtml;
  // Workspace files the entry references explicitly, excluded from the
  // implicit CodePen-style injection below.
  const referenced = new Set<string>();
  // Entry lines each replaced tag occupied, so the entry's own numbering
  // can resume past the block that took its place.
  const consumedByFile = new Map<string, number[]>();
  const consumed = (path: string, tag: string) => {
    const counts = consumedByFile.get(path) ?? [];
    counts.push(lineCount(tag));
    consumedByFile.set(path, counts);
  };

  // <link rel="stylesheet" href="styles.css"> → <style>…</style>
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    const rel = getAttr(tag, "rel");
    if (!rel || rel.toLowerCase() !== "stylesheet") return tag;
    const href = getAttr(tag, "href");
    if (!href) return tag;
    const path = normalizeAssetPath(href);
    const css = textFiles.get(path);
    if (css === undefined) return tag; // external URL, leave it alone
    referenced.add(path);
    consumed(path, tag);
    return `<style data-inlined-from="${path}" data-source-lines="${lineCount(css)}">\n${escapeInlineStyleContent(css)}\n</style>`;
  });

  // <script src="app.js"></script> → <script>…</script>
  html = html.replace(
    /<script\b([^>]*)>\s*<\/script>/gi,
    (tag, attrs: string) => {
      const src = getAttr(tag, "src");
      if (!src) return tag;
      const path = normalizeAssetPath(src);
      const js = textFiles.get(path);
      if (js === undefined) return tag; // external URL, leave it alone
      referenced.add(path);
      consumed(path, tag);
      const type = getAttr(tag, "type");
      const isModule = type?.toLowerCase() === "module";
      const escaped = escapeInlineScriptContent(js);
      const stamp = `data-inlined-from="${path}" data-source-lines="${lineCount(js)}"`;
      if (isModule) {
        // Module scripts are deferred by definition; inlining keeps timing.
        return `<script type="module" ${stamp}>\n${escaped}\n</script>`;
      }
      if (hasBareAttr(attrs, "defer")) {
        // Approximate classic `defer` with a DOMContentLoaded wrapper; the
        // one observable difference is top-level declarations becoming
        // listener-local. The wrapper line shifts the file's own first
        // line down by one, which `data-source-offset` records.
        return `<script ${stamp} data-source-offset="1">\ndocument.addEventListener("DOMContentLoaded", function () {\n${escaped}\n});\n</script>`;
      }
      return `<script ${stamp}>\n${escaped}\n</script>`;
    },
  );

  // <img src="cat.png"> → data URI (uploaded workspace assets only).
  html = html.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = getAttr(tag, "src");
    if (!src) return tag;
    const path = normalizeAssetPath(src);
    const mime = mimeForFilename(path);
    if (!mime) return tag;
    const bytes = binaryFiles.get(path);
    const text = textFiles.get(path);
    if (bytes === undefined && text === undefined) return tag;
    const b64 = bytes !== undefined
      ? bytesToBase64(bytes)
      : bytesToBase64(new TextEncoder().encode(text));
    // Rewrite the src ATTRIBUTE only — a bare replace could clobber an
    // alt/title containing the same text.
    const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return tag.replace(
      new RegExp(`(\\bsrc\\s*=\\s*)(["']?)${escaped}\\2`, "i"),
      `$1$2data:${mime};base64,${b64}$2`,
    );
  });

  // Implicit CodePen-style composition: styles append after the markup
  // (last word in the cascade), scripts last so they see the parsed DOM.
  // Sorted for deterministic ordering.
  const injectable = [...textFiles.keys()]
    .filter((path) => !path.includes("/") && !referenced.has(path))
    .sort();
  for (const path of injectable) {
    if (/\.css$/i.test(path)) {
      const css = textFiles.get(path)!;
      html += `\n<style data-injected-from="${path}" data-source-lines="${lineCount(css)}">\n${escapeInlineStyleContent(css)}\n</style>`;
    }
  }
  for (const path of injectable) {
    if (/\.(js|mjs)$/i.test(path)) {
      const js = textFiles.get(path)!;
      const type = /\.mjs$/i.test(path) ? ' type="module"' : "";
      html += `\n<script${type} data-injected-from="${path}" data-source-lines="${lineCount(js)}">\n${escapeInlineScriptContent(js)}\n</script>`;
    }
  }

  if (input.omitBridge) {
    const bare = input.tailwind ? tailwindScriptTag() : "";
    return bare ? injectAtDocumentStart(html, bare) : html;
  }

  // The bridge carries the line map, and the map's own line numbers count
  // the bridge — JSON.stringify never emits a newline, so a bridge built
  // with an empty map has exactly the height of the real one, and the
  // measurement is not circular.
  const probe = buildPreviewBridge(input.token, []);
  const bridgeLines = lineCount(probe) - 1;
  const headLine = injectionLine(html);
  const map = buildSourceLineMap(
    html,
    input.entryFile ?? "index.html",
    consumedByFile,
  ).flatMap(
    (range) => shiftRange(range, headLine, bridgeLines),
  );

  let out = buildPreviewBridge(input.token, map);
  if (input.tailwind) out += tailwindScriptTag();
  return injectAtDocumentStart(html, out);
}

/** Line of `html` the bridge splices into (see injectAtDocumentStart). */
function injectionLine(html: string): number {
  const match = html.match(/<head\b[^>]*>/i) ?? html.match(/<html\b[^>]*>/i);
  if (!match || match.index === undefined) return 0;
  return lineCount(html.slice(0, match.index + match[0].length));
}

/** Re-place a range around the bridge, which lands mid-document and pushes
 *  everything after its insertion line down. A range that straddles the
 *  insertion point splits in two. */
function shiftRange(
  range: SourceLineRange,
  headLine: number,
  bridgeLines: number,
): SourceLineRange[] {
  if (bridgeLines === 0 || range.from > headLine) {
    const delta = range.from > headLine ? bridgeLines : 0;
    return [{ ...range, from: range.from + delta, to: range.to + delta }];
  }
  if (range.to <= headLine) return [range];
  const headPart = { ...range, to: headLine };
  const tailPart: SourceLineRange = {
    file: range.file,
    from: headLine + 1 + bridgeLines,
    to: range.to + bridgeLines,
    at: range.at + (headLine + 1 - range.from),
  };
  return [headPart, tailPart];
}

export interface ReactComposeInput {
  /** Bundled ESM JavaScript produced by the esbuild worker. */
  js: string;
  /** Bundled CSS (from `import "./styles.css"` in user code), if any. */
  css?: string;
  /** Per-run bridge token. */
  token: string;
  /** Inject the pinned Tailwind browser compiler before user code. */
  tailwind?: boolean;
}

/**
 * Compose the srcdoc for a React run, and say which line the bundle starts
 * on: a runtime error reports a position in this document, and only the
 * bundler's source map can turn a *bundle* line back into `App.tsx`.
 */
export function composeReactDocumentWithMeta(input: ReactComposeInput): {
  doc: string;
  bundleStartLine: number;
} {
  const doc = composeReactDocument(input);
  const marker = doc.indexOf('<script type="module">');
  // The bundle's first line is the one after the opening tag.
  const bundleStartLine =
    marker === -1 ? 1 : lineCount(doc.slice(0, marker)) + 1;
  return { doc, bundleStartLine };
}

/** Compose the srcdoc for a React run: bridge + styles + a `#root`
 *  mount node + the bundle as an inline module script. */
export function composeReactDocument(input: ReactComposeInput): string {
  const bridge = buildPreviewBridge(input.token);
  const tailwind = input.tailwind ? tailwindScriptTag() : "";
  const style = input.css
    ? `<style>\n${escapeInlineStyleContent(input.css)}\n</style>`
    : "";
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
${bridge}${tailwind}${style}
</head>
<body>
<div id="root"></div>
<script type="module">
${escapeInlineScriptContent(input.js)}
</script>
</body>
</html>`;
}

// ─── Run lifecycle (browser-only) ────────────────────────────────────────

function cellTypeFor(level: PreviewConsoleLevel): "stdout" | "stderr" {
  return level === "warn" || level === "error" ? "stderr" : "stdout";
}

/**
 * Forward one preview frame's console output to `emit` until the returned
 * function is called. Used by the auto-rendered preview, whose frame is
 * already in the page's HTML. The frame is asked to replay pre-subscribe
 * output; replayed and live messages are deduped on the bridge's sequence
 * number — not on text, which would collapse genuinely repeated lines.
 */
export function subscribeToPreviewConsole(options: {
  frame: HTMLIFrameElement;
  token: string;
  emit: EmitOutput;
}): () => void {
  const seen = new Set<number>();
  const onMessage = (ev: MessageEvent) => {
    const data = ev.data as
      | (PreviewMessage & Record<string, unknown>)
      | null
      | undefined;
    if (!data || typeof data !== "object") return;
    if (data[PREVIEW_MESSAGE_KEY] !== options.token) return;
    const n = data.n;
    if (typeof n === "number") {
      if (seen.has(n)) return;
      seen.add(n);
    }
    if (data.t === "console") {
      options.emit({ type: cellTypeFor(data.level), content: data.text });
    } else if (data.t === "error") {
      options.emit({ type: "stderr", content: data.text });
    }
  };
  window.addEventListener("message", onMessage);
  try {
    options.frame.contentWindow?.postMessage(
      { [PREVIEW_REPLAY_KEY]: options.token },
      "*",
    );
  } catch {
    // A not-yet-ready frame still posts live; replay is only the catch-up.
  }
  return () => window.removeEventListener("message", onMessage);
}

// The preview stays interactive after a run resolves, so its message
// listener stays attached until the NEXT run on the same host replaces the
// iframe. This map holds the retire-previous-listener callback per host.
const liveConsoleCleanup = new WeakMap<HTMLElement, () => void>();

// Off-DOM fallback host so a run without a surface slot (tests, future
// headless callers) still executes and reports console output.
let fallbackHost: HTMLElement | null = null;
function getFallbackHost(): HTMLElement {
  if (!fallbackHost || !fallbackHost.isConnected) {
    fallbackHost = document.createElement("div");
    fallbackHost.style.display = "none";
    fallbackHost.setAttribute("aria-hidden", "true");
    document.body.appendChild(fallbackHost);
  }
  return fallbackHost;
}

export interface PreviewRunRequest {
  /** Fully composed srcdoc (bridge already injected with `token`). */
  doc: string;
  /** The token baked into the document's bridge. */
  token: string;
  emit: EmitOutput;
  /** Surface-owned slot; the previous run's iframe (if any) is replaced. */
  previewHost?: HTMLElement | null;
  /** Resolve on the harness-done signal instead of document load. */
  waitForHarness: boolean;
  /**
   * Composed position → `file:line:column`, for a document the composer
   * could not map line-for-line. The React bundle is the case: only the
   * bundler's source map knows where a bundle line came from.
   */
  locate?: (line: number, column: number) => string | null;
}

/** Frames name the composed document; a run that can map them rewrites
 *  each one so a trace reads in the reader's own files. */
function applyLocations(
  message: Extract<PreviewMessage, { t: "error" }>,
  locate: PreviewRunRequest["locate"],
): string {
  if (!locate) return message.text;
  let text = message.text.replace(
    /about:srcdoc:(\d+):(\d+)/g,
    (whole, line: string, column: string) =>
      locate(Number(line), Number(column)) ?? whole,
  );
  if (!message.located && typeof message.line === "number" && message.line > 0) {
    const at = locate(message.line, message.column ?? 0);
    if (at) text += ` (${at})`;
  }
  return text;
}

/**
 * Mount the composed document in a fresh sandboxed iframe and forward its
 * bridge messages to `emit`. Plain runs resolve shortly after `load`;
 * harness runs resolve on the harness-done signal (postMessage is FIFO per
 * source, so all sentinels are captured first); a silent document trips a
 * deadline. Never rejects — failures surface as stderr cells.
 */
export function runPreviewDocument(req: PreviewRunRequest): Promise<void> {
  return new Promise<void>((resolve) => {
    const host = req.previewHost ?? getFallbackHost();

    // Retire the previous run's console listener; its iframe is about to
    // be replaced.
    liveConsoleCleanup.get(host)?.();
    liveConsoleCleanup.delete(host);

    const iframe = document.createElement("iframe");
    iframe.className = PREVIEW_IFRAME_CLASS;
    iframe.setAttribute("sandbox", PREVIEW_SANDBOX);
    iframe.setAttribute("title", "Page preview");
    iframe.srcdoc = req.doc;

    let settled = false;
    let settleTimer: number | null = null;
    let deadlineTimer: number | null = null;

    const removeListener = () => {
      window.removeEventListener("message", onMessage);
      if (liveConsoleCleanup.get(host) === removeListener) {
        liveConsoleCleanup.delete(host);
      }
    };

    const finish = () => {
      if (settled) return;
      settled = true;
      if (settleTimer !== null) window.clearTimeout(settleTimer);
      if (deadlineTimer !== null) window.clearTimeout(deadlineTimer);
      cancelRunningPreview.delete(host);
      resolve();
      // Do NOT detach the listener: the preview stays interactive, so keep
      // forwarding console output until the next run replaces this iframe.
      liveConsoleCleanup.set(host, removeListener);
    };

    const onMessage = (ev: MessageEvent) => {
      const data = ev.data as
        | (PreviewMessage & Record<string, unknown>)
        | null
        | undefined;
      if (!data || typeof data !== "object") return;
      if (data[PREVIEW_MESSAGE_KEY] !== req.token) return;
      if (data.t === "console") {
        req.emit({ type: cellTypeFor(data.level), content: data.text });
      } else if (data.t === "error") {
        req.emit({ type: "stderr", content: applyLocations(data, req.locate) });
      } else if (data.t === "loaded") {
        if (!req.waitForHarness && settleTimer === null) {
          settleTimer = window.setTimeout(finish, LOADED_SETTLE_MS);
        }
      } else if (data.t === "harness-done") {
        if (req.waitForHarness) finish();
      }
    };

    window.addEventListener("message", onMessage);
    deadlineTimer = window.setTimeout(
      () => {
        // A page that never finished loading is wedged: its script has not
        // yielded, and a frame that never yields never delivers the
        // messages queued in it either, so anything it logged before the
        // loop is gone with it. Say that, rather than claiming a live
        // preview that is in fact frozen.
        const seconds = Math.round(
          (req.waitForHarness ? HARNESS_DEADLINE_MS : LOAD_DEADLINE_MS) / 1000,
        );
        req.emit({
          type: "stderr",
          content:
            `The page didn't finish loading within ${seconds}s, so a script is probably stuck in a ` +
            "loop. The frozen preview has been torn down; output it produced before it stopped " +
            "responding cannot be recovered from it.",
        });
        host.replaceChildren();
        finish();
      },
      req.waitForHarness ? HARNESS_DEADLINE_MS : LOAD_DEADLINE_MS,
    );

    // Cancellation is teardown: the frame IS the running program, so
    // removing it ends the run outright.
    cancelRunningPreview.set(host, () => {
      if (settled) return;
      host.replaceChildren();
      req.emit({ type: "stderr", content: "Run stopped." });
      finish();
    });

    // Swapping the children tears down the previous run's document.
    host.replaceChildren(iframe);
  });
}

// Teardown for the run in flight on a given host, so the surface's Stop
// control has something to call.
const cancelRunningPreview = new WeakMap<HTMLElement, () => void>();

/** Stop the preview running on `host`, if any. Safe to call when idle. */
export function cancelPreviewRun(host: HTMLElement | null | undefined): void {
  if (!host) return;
  const cancel = cancelRunningPreview.get(host);
  cancelRunningPreview.delete(host);
  cancel?.();
}
