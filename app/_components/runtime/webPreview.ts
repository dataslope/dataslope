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
  | { t: "error"; text: string }
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

/**
 * Bridge script injected at the top of every preview document, before any
 * user code. Console args are serialized to final strings inside the iframe
 * so nothing structured-clone-unfriendly hits postMessage.
 */
export function buildPreviewBridge(token: string): string {
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
  var MAX_DEPTH = 3;
  var MAX_ITEMS = 20;
  function describe(v, depth, seen) {
    if (v === null) return "null";
    var t = typeof v;
    if (t === "string") return depth === 0 ? v : JSON.stringify(v);
    if (t === "number" || t === "boolean" || t === "bigint" || t === "symbol" || t === "undefined") {
      return String(v);
    }
    if (t === "function") return "[Function: " + (v.name || "anonymous") + "]";
    if (v instanceof Error) return (v.name || "Error") + ": " + v.message;
    if (typeof Node !== "undefined" && v instanceof Node) {
      if (v.nodeType === 1) {
        var html = v.outerHTML || ("<" + v.nodeName.toLowerCase() + ">");
        return html.length > 200 ? html.slice(0, 200) + "…" : html;
      }
      return "[" + v.nodeName + "]";
    }
    if (seen.indexOf(v) !== -1) return "[Circular]";
    if (depth >= MAX_DEPTH) return Array.isArray(v) ? "[Array]" : "[Object]";
    seen.push(v);
    var out;
    if (Array.isArray(v)) {
      var items = [];
      for (var i = 0; i < v.length && i < MAX_ITEMS; i++) {
        items.push(describe(v[i], depth + 1, seen));
      }
      if (v.length > MAX_ITEMS) items.push("… " + (v.length - MAX_ITEMS) + " more");
      out = "[" + items.join(", ") + "]";
    } else {
      var keys = Object.keys(v);
      var parts = [];
      for (var k = 0; k < keys.length && k < MAX_ITEMS; k++) {
        parts.push(keys[k] + ": " + describe(v[keys[k]], depth + 1, seen));
      }
      if (keys.length > MAX_ITEMS) parts.push("… " + (keys.length - MAX_ITEMS) + " more");
      var tag = v.constructor && v.constructor.name && v.constructor.name !== "Object"
        ? v.constructor.name + " " : "";
      out = tag + "{ " + parts.join(", ") + " }";
    }
    seen.pop();
    return out;
  }
  function fmt(args) {
    var parts = [];
    for (var i = 0; i < args.length; i++) parts.push(describe(args[i], 0, []));
    return parts.join(" ");
  }
  var levels = ["log", "info", "warn", "error", "debug"];
  for (var li = 0; li < levels.length; li++) {
    (function (level) {
      var original = console[level] ? console[level].bind(console) : null;
      console[level] = function () {
        var args = Array.prototype.slice.call(arguments);
        var text;
        try { text = fmt(args); } catch (e) { text = "[unserializable console arguments]"; }
        post({ t: "console", level: level, text: text });
        if (original) original.apply(null, args);
      };
    })(levels[li]);
  }
  window.addEventListener("error", function (ev) {
    var text = ev.message || "Uncaught error";
    if (ev.error && ev.error.name && text.indexOf(ev.error.name) === -1) {
      text = ev.error.name + ": " + text;
    }
    if (typeof ev.lineno === "number" && ev.lineno > 0) {
      text += " (line " + ev.lineno + ")";
    }
    post({ t: "error", text: text });
  });
  window.addEventListener("unhandledrejection", function (ev) {
    var reason = ev.reason;
    var text = reason instanceof Error
      ? (reason.name || "Error") + ": " + reason.message
      : "Unhandled promise rejection: " + describe(reason, 0, []);
    post({ t: "error", text: text });
  });
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
  /** Per-run bridge token. Required unless `bridge` is false. */
  token?: string;
  /** Inject the console bridge. Default true. The server-rendered
   *  auto-preview passes false: the per-call random token would make the
   *  server and browser renders differ — a hydration mismatch. */
  bridge?: boolean;
  /** Workspace text files by relative path; `<link>`/`<script src>`
   *  references to these are inlined so the document is self-contained. */
  textFiles?: Map<string, string>;
  /** Binary files (uploads); `<img src>` references become data URIs. */
  binaryFiles?: Map<string, Uint8Array>;
  /** Inject the pinned Tailwind browser compiler before user code. */
  tailwind?: boolean;
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
    return `<style data-inlined-from="${path}">\n${escapeInlineStyleContent(css)}\n</style>`;
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
      const type = getAttr(tag, "type");
      const isModule = type?.toLowerCase() === "module";
      const escaped = escapeInlineScriptContent(js);
      if (isModule) {
        // Module scripts are deferred by definition; inlining keeps timing.
        return `<script type="module" data-inlined-from="${path}">\n${escaped}\n</script>`;
      }
      if (hasBareAttr(attrs, "defer")) {
        // Approximate classic `defer` with a DOMContentLoaded wrapper; the
        // one observable difference is top-level declarations becoming
        // listener-local.
        return `<script data-inlined-from="${path}">\ndocument.addEventListener("DOMContentLoaded", function () {\n${escaped}\n});\n</script>`;
      }
      return `<script data-inlined-from="${path}">\n${escaped}\n</script>`;
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
      html += `\n<style data-injected-from="${path}">\n${escapeInlineStyleContent(css)}\n</style>`;
    }
  }
  for (const path of injectable) {
    if (/\.(js|mjs)$/i.test(path)) {
      const js = textFiles.get(path)!;
      const type = /\.mjs$/i.test(path) ? ' type="module"' : "";
      html += `\n<script${type} data-injected-from="${path}">\n${escapeInlineScriptContent(js)}\n</script>`;
    }
  }

  let prelude = "";
  if (input.bridge !== false) {
    if (input.token === undefined) {
      // A silently bridgeless document would send console output nowhere
      // and look like a block that prints nothing.
      throw new Error(
        "composeWebDocument: `token` is required unless `bridge: false`.",
      );
    }
    prelude += buildPreviewBridge(input.token);
  }
  if (input.tailwind) prelude += tailwindScriptTag();
  if (!prelude) return html;
  return injectAtDocumentStart(html, prelude);
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
        req.emit({ type: "stderr", content: data.text });
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
        req.emit({
          type: "stderr",
          content:
            "The preview didn't finish within the time limit, a script may be stuck in a loop. " +
            "The preview stays live above; run again to replace it.",
        });
        finish();
      },
      req.waitForHarness ? HARNESS_DEADLINE_MS : LOAD_DEADLINE_MS,
    );

    // Swapping the children tears down the previous run's document.
    host.replaceChildren(iframe);
  });
}
