/**
 * Unit tests for the web-preview composition helpers (pure functions,
 * no iframe/browser machinery). The run lifecycle itself is exercised
 * end-to-end by the Playwright specs against real browsers.
 */
import { describe, it, expect } from "vitest";

import {
  PREVIEW_REPLAY_KEY,
  buildPreviewBridge,
  composeReactDocument,
  composeWebDocument,
  escapeInlineScriptContent,
  hasHarnessMarker,
  injectAtDocumentStart,
  newPreviewToken,
  PREVIEW_MESSAGE_KEY,
} from "../app/_components/runtime/webPreview";
import { buildHarness, HARNESS_BEGIN } from "../app/_components/challengeHarness";
import { TAILWIND_BROWSER_CDN } from "../app/_components/runtime/cdn";
import { webAdapter } from "../app/_components/runtime/web";
import { reactAdapter } from "../app/_components/runtime/react";

describe("injectAtDocumentStart", () => {
  it("injects right after <head> when present", () => {
    const html = `<!doctype html><html><head><title>x</title></head><body></body></html>`;
    const out = injectAtDocumentStart(html, "<script>B</script>");
    expect(out.indexOf("<script>B</script>")).toBe(
      html.indexOf("<head>") + "<head>".length,
    );
  });

  it("injects after <html> when there is no <head>", () => {
    const html = `<html lang="en"><body><h1>hi</h1></body></html>`;
    const out = injectAtDocumentStart(html, "<x/>");
    expect(out.startsWith(`<html lang="en"><x/>`)).toBe(true);
  });

  it("prepends for fragments", () => {
    const out = injectAtDocumentStart("<h1>hi</h1>", "<x/>");
    expect(out).toBe("<x/><h1>hi</h1>");
  });
});

describe("escapeInlineScriptContent", () => {
  it("escapes closing script tags case-insensitively", () => {
    expect(escapeInlineScriptContent(`a = "</script>"; b = "</SCRIPT>"`)).toBe(
      `a = "<\\/script>"; b = "<\\/SCRIPT>"`,
    );
  });
});

describe("buildPreviewBridge", () => {
  it("bakes the token and message key into the script", () => {
    const bridge = buildPreviewBridge("tok123");
    expect(bridge).toContain(`"tok123"`);
    expect(bridge).toContain(PREVIEW_MESSAGE_KEY);
    expect(bridge.startsWith("<script>")).toBe(true);
    expect(bridge.endsWith("</script>")).toBe(true);
  });
});

describe("newPreviewToken", () => {
  it("produces distinct tokens", () => {
    expect(newPreviewToken()).not.toBe(newPreviewToken());
  });
});

describe("composeWebDocument", () => {
  const token = "tok";

  it("injects the bridge before user scripts", () => {
    const doc = composeWebDocument({
      entryHtml: `<html><head><script>console.log("user")</script></head></html>`,
      token,
    });
    expect(doc.indexOf(PREVIEW_MESSAGE_KEY)).toBeGreaterThan(-1);
    expect(doc.indexOf(PREVIEW_MESSAGE_KEY)).toBeLessThan(
      doc.indexOf(`console.log("user")`),
    );
  });

  it("inlines workspace stylesheets referenced by <link>", () => {
    const doc = composeWebDocument({
      entryHtml: `<html><head><link rel="stylesheet" href="./styles.css" /></head></html>`,
      token,
      textFiles: new Map([["styles.css", "body { color: red; }"]]),
    });
    expect(doc).toContain("body { color: red; }");
    expect(doc).toContain(`data-inlined-from="styles.css"`);
    expect(doc).not.toContain("<link");
  });

  it("leaves external stylesheets alone", () => {
    const entry = `<link rel="stylesheet" href="https://cdn.example/x.css">`;
    const doc = composeWebDocument({ entryHtml: entry, token });
    expect(doc).toContain(entry);
  });

  it("inlines workspace scripts referenced by <script src>", () => {
    const doc = composeWebDocument({
      entryHtml: `<body><script src="app.js"></script></body>`,
      token,
      textFiles: new Map([["app.js", `console.log("hello")`]]),
    });
    expect(doc).toContain(`console.log("hello")`);
    expect(doc).not.toContain(`src="app.js"`);
  });

  it("preserves module semantics for type=module scripts", () => {
    const doc = composeWebDocument({
      entryHtml: `<script type="module" src="m.js"></script>`,
      token,
      textFiles: new Map([["m.js", "export {};"]]),
    });
    expect(doc).toContain(`<script type="module" data-inlined-from="m.js" data-source-lines="1">`);
  });

  it("wraps classic defer scripts in DOMContentLoaded", () => {
    const doc = composeWebDocument({
      entryHtml: `<head><script defer src="d.js"></script></head>`,
      token,
      textFiles: new Map([["d.js", "setup();"]]),
    });
    expect(doc).toContain("DOMContentLoaded");
    expect(doc).toContain("setup();");
  });

  it("escapes </script> sequences in inlined JS", () => {
    const doc = composeWebDocument({
      entryHtml: `<script src="a.js"></script>`,
      token,
      textFiles: new Map([["a.js", `const s = "</script>";`]]),
    });
    expect(doc).toContain(`const s = "<\\/script>";`);
  });

  it("inlines workspace images as data URIs", () => {
    const doc = composeWebDocument({
      entryHtml: `<img src="dot.png" alt="dot">`,
      token,
      binaryFiles: new Map([["dot.png", new Uint8Array([1, 2, 3])]]),
    });
    expect(doc).toContain("data:image/png;base64,");
    expect(doc).not.toContain(`src="dot.png"`);
  });

  it("auto-injects unreferenced root-level css/js, CodePen-style", () => {
    const doc = composeWebDocument({
      entryHtml: `<h1>fragment</h1>`,
      token,
      textFiles: new Map([
        ["styles.css", "h1 { color: teal; }"],
        ["script.js", `console.log("implicit")`],
      ]),
    });
    expect(doc).toContain(`data-injected-from="styles.css"`);
    expect(doc).toContain("h1 { color: teal; }");
    expect(doc).toContain(`data-injected-from="script.js"`);
    expect(doc).toContain(`console.log("implicit")`);
    // Styles inject before scripts; scripts run after the user markup.
    expect(doc.indexOf("<h1>fragment</h1>")).toBeLessThan(
      doc.indexOf(`data-injected-from="styles.css"`),
    );
    expect(doc.indexOf(`data-injected-from="styles.css"`)).toBeLessThan(
      doc.indexOf(`data-injected-from="script.js"`),
    );
  });

  it("does not double-apply files the entry references explicitly", () => {
    const doc = composeWebDocument({
      entryHtml: `<link rel="stylesheet" href="styles.css"><script src="script.js"></script>`,
      token,
      textFiles: new Map([
        ["styles.css", "h1 { color: teal; }"],
        ["script.js", `console.log("explicit")`],
      ]),
    });
    expect(doc).toContain(`data-inlined-from="styles.css"`);
    expect(doc).not.toContain(`data-injected-from="styles.css"`);
    expect(doc).not.toContain(`data-injected-from="script.js"`);
    expect(doc.match(/console\.log\("explicit"\)/g)).toHaveLength(1);
  });

  it("never auto-injects nested files or other html pages", () => {
    const doc = composeWebDocument({
      entryHtml: `<h1>page</h1>`,
      token,
      textFiles: new Map([
        ["vendor/lib.js", `console.log("nested")`],
        ["about.html", "<h1>about</h1>"],
      ]),
    });
    expect(doc).not.toContain("data-injected-from");
    expect(doc).not.toContain(`console.log("nested")`);
    expect(doc).not.toContain("<h1>about</h1>");
  });

  it("injects the pinned Tailwind compiler when asked", () => {
    const doc = composeWebDocument({
      entryHtml: "<h1>x</h1>",
      token,
      tailwind: true,
    });
    expect(doc).toContain(TAILWIND_BROWSER_CDN);
  });

  it("omits Tailwind by default", () => {
    const doc = composeWebDocument({ entryHtml: "<h1>x</h1>", token });
    expect(doc).not.toContain(TAILWIND_BROWSER_CDN);
  });
});

describe("composeReactDocument", () => {
  it("embeds the bundle, styles, root node, and bridge", () => {
    const doc = composeReactDocument({
      js: `console.log("app")`,
      css: "body { margin: 0; }",
      token: "tok",
    });
    expect(doc).toContain(`<div id="root"></div>`);
    expect(doc).toContain(`console.log("app")`);
    expect(doc).toContain("body { margin: 0; }");
    expect(doc).toContain(PREVIEW_MESSAGE_KEY);
    // Bridge must come before the app bundle.
    expect(doc.indexOf(PREVIEW_MESSAGE_KEY)).toBeLessThan(
      doc.indexOf(`console.log("app")`),
    );
  });
});

describe("hasHarnessMarker", () => {
  it("detects harnesses produced by buildHarness for web/react", () => {
    const tests = [
      { id: "t1", name: "t1", code: "if (false) throw new Error('x');" },
    ];
    expect(hasHarnessMarker(buildHarness("web", tests))).toBe(true);
    expect(hasHarnessMarker(buildHarness("react", tests))).toBe(true);
    expect(hasHarnessMarker("<h1>plain page</h1>")).toBe(false);
    expect(HARNESS_BEGIN.length).toBeGreaterThan(0);
  });
});

describe("composeWebDocument always carries the bridge", () => {
  it("injects the bridge with the caller's token", () => {
    // Every composed document is bridged — a bridgeless one would send a
    // run's console output nowhere and render as a block that prints
    // nothing. The auto-preview keeps determinism with a derived token,
    // not by omitting the bridge.
    const doc = composeWebDocument({ entryHtml: "<h1>hi</h1>", token: "tok" });
    expect(doc).toContain(PREVIEW_MESSAGE_KEY);
    expect(doc).toContain("<h1>hi</h1>");
  });
});

describe("webAdapter.composeStaticPreview", () => {
  const sources = [
    {
      filename: "index.html",
      source: `<link rel="stylesheet" href="styles.css"><h1>Hi</h1>`,
    },
    { filename: "styles.css", source: "h1 { color: red; }" },
    { filename: "extra.js", source: `console.log("side")` },
  ];
  const TOKEN = "block-1a2b3c4d";
  const compose = (token = TOKEN) =>
    webAdapter.composeStaticPreview!(sources, {
      entryFilename: "index.html",
      token,
    });

  it("inlines referenced files and appends unreferenced root-level ones", () => {
    const doc = compose()!;
    expect(doc).toContain("h1 { color: red; }");
    expect(doc).toContain(`data-inlined-from="styles.css"`);
    expect(doc).toContain(`data-injected-from="extra.js"`);
  });

  it("is deterministic — the property hydration depends on", () => {
    // The server and the browser both compose this document and React
    // compares the two, so the same block must compose byte-identically
    // every time. This is why the token is passed in rather than drawn.
    expect(compose()).toBe(compose());
  });

  it("carries the bridge, so its console output can reach the panel", () => {
    // Without it the frame still prints — into the browser's devtools,
    // where the bridge echoes — and the block's own output panel stays
    // empty, making the site the one place the output is missing.
    const doc = compose()!;
    expect(doc).toContain(PREVIEW_MESSAGE_KEY);
    expect(doc).toContain(TOKEN);
  });

  it("agrees exactly with what a real Run composes", () => {
    // Anti-drift guard: a preview that disagrees with the reader's own Run is
    // worse than no preview. Both paths must compose identical documents.
    const textFiles = new Map(sources.map((f) => [f.filename, f.source]));
    const runDoc = composeWebDocument({
      entryHtml: sources[0].source,
      token: TOKEN,
      textFiles,
      entryFile: sources[0].filename,
    });
    expect(runDoc).toBe(compose());
    // The bridge carries this document's own line map, so compare the part
    // that does not: everything up to where the map is spliced in.
    const bridgeHead = buildPreviewBridge(TOKEN).split("var SOURCES =")[0];
    expect(runDoc).toContain(bridgeHead);
  });

  it("falls back to the first file when the entry name is unknown", () => {
    expect(
      webAdapter.composeStaticPreview!(sources, {
        entryFilename: "nope.html",
        token: TOKEN,
      }),
    ).toBe(compose());
  });

  it("returns null for an empty workspace", () => {
    expect(
      webAdapter.composeStaticPreview!([], {
        entryFilename: "index.html",
        token: TOKEN,
      }),
    ).toBeNull();
  });
});

describe("auto-preview is opt-in per adapter", () => {
  it("both preview adapters render themselves", () => {
    for (const adapter of [webAdapter, reactAdapter]) {
      expect(adapter.outputCapabilities?.preview).toBe(true);
      expect(adapter.outputCapabilities?.autoPreview).toBe(true);
      expect(typeof adapter.composeStaticPreview).toBe("function");
    }
  });

  it("react composes from a precompiled bundle, never from source", () => {
    // Bundling in the browser would need the ~3 MB esbuild-wasm download the
    // build-time bundle exists to avoid. No bundle, no preview.
    const sources = [{ filename: "main.tsx", source: "export {}" }];
    expect(
      reactAdapter.composeStaticPreview!(sources, {
        entryFilename: "main.tsx",
        token: "tok",
      }),
    ).toBeNull();

    const doc = reactAdapter.composeStaticPreview!(sources, {
      entryFilename: "main.tsx",
      token: "tok",
      bundle: { js: "console.log('compiled')", css: "body{margin:0}" },
    })!;
    expect(doc).toContain("console.log('compiled')");
    expect(doc).toContain("body{margin:0}");
    expect(doc).toContain(`<div id="root"></div>`);
    // Bridged and deterministic, exactly like the web one.
    expect(doc).toContain(PREVIEW_MESSAGE_KEY);
    expect(doc).toBe(
      reactAdapter.composeStaticPreview!(sources, {
        entryFilename: "main.tsx",
        token: "tok",
        bundle: { js: "console.log('compiled')", css: "body{margin:0}" },
      }),
    );
  });
});

describe("bridge replay buffer", () => {
  // The server-rendered frame runs while page JS is still downloading, so the
  // block has usually printed before React subscribes; without a replay those
  // messages are lost.
  it("buffers what it posts and re-posts on request", () => {
    const js = buildPreviewBridge("tok");
    expect(js).toContain(PREVIEW_REPLAY_KEY);
    expect(js).toContain("buffered");
    // Bounded, so a runaway loop can't grow the frame's memory without limit.
    expect(js).toMatch(/MAX_BUFFERED\s*=\s*\d+/);
  });

  it("numbers every message so a replay can be deduped", () => {
    // postMessage structured-clones, so a replayed message arrives as a
    // different object with identical contents. Identity can't dedupe it
    // and text would collapse a block that logs the same line twice.
    expect(buildPreviewBridge("tok")).toMatch(/msg\.n\s*=\s*seq\+\+/);
  });

  it("is deterministic for a given token", () => {
    expect(buildPreviewBridge("tok")).toBe(buildPreviewBridge("tok"));
    expect(buildPreviewBridge("a")).not.toBe(buildPreviewBridge("b"));
  });
});
