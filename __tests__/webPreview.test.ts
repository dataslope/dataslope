/**
 * Unit tests for the web-preview composition helpers (pure functions —
 * no iframe/browser machinery). The run lifecycle itself is exercised
 * end-to-end by the Playwright specs against real browsers.
 */
import { describe, it, expect } from "vitest";

import {
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
    expect(doc).toContain(`<script type="module" data-inlined-from="m.js">`);
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
