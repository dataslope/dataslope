// Stale-build recovery (app/_components/staleBuild.ts). A tab left open
// across a deploy asks for hashed chunks the origin no longer serves; the
// crash that follows is an ordinary TypeError thrown at module evaluation,
// not a ChunkLoadError, so the 404 itself has to be the signal.
import { describe, expect, it } from "vitest";

import {
  ASSET_FAILURE_GLOBAL,
  RELOAD_COOLDOWN_MS,
  STALE_BUILD_WATCHER_SCRIPT,
  isBuildAssetUrl,
  looksLikeStaleBuildError,
  shouldReloadForStaleBuild,
} from "../app/_components/staleBuild";

describe("isBuildAssetUrl", () => {
  it("matches hashed build output, absolute or relative", () => {
    expect(isBuildAssetUrl("/_next/static/chunks/23dphzdqxtiv6.js")).toBe(true);
    expect(
      isBuildAssetUrl("https://dataslope.com/_next/static/chunks/2j13i86rt3126.css"),
    ).toBe(true);
  });

  it("ignores everything else", () => {
    expect(isBuildAssetUrl("/logo-files/SVG/dataslope-logo-white.svg")).toBe(false);
    expect(isBuildAssetUrl("https://cdn.jsdelivr.net/pyodide/pyodide.js")).toBe(false);
    expect(isBuildAssetUrl("/_next/image?url=%2Fcover.webp")).toBe(false);
    expect(isBuildAssetUrl(undefined)).toBe(false);
    expect(isBuildAssetUrl(null)).toBe(false);
  });
});

describe("looksLikeStaleBuildError", () => {
  it("recognises the messages bundlers and browsers use", () => {
    const err = new Error("Loading chunk 4821 failed.");
    err.name = "ChunkLoadError";
    expect(looksLikeStaleBuildError(err)).toBe(true);
    expect(
      looksLikeStaleBuildError(
        new Error("Failed to fetch dynamically imported module: /_next/static/x.js"),
      ),
    ).toBe(true);
    expect(
      looksLikeStaleBuildError(new Error("Importing a module script failed.")),
    ).toBe(true);
    expect(
      looksLikeStaleBuildError(
        new Error("Module was instantiated but the module factory is not available"),
      ),
    ).toBe(true);
  });

  it("does not recognise the error the original report actually threw", () => {
    // The whole reason the watcher exists: a missing chunk leaves an import
    // undefined and the crash reads like any other bug.
    expect(
      looksLikeStaleBuildError(
        new TypeError("Cannot read properties of undefined (reading 'map')"),
      ),
    ).toBe(false);
  });

  it("ignores non-errors", () => {
    expect(looksLikeStaleBuildError(null)).toBe(false);
    expect(looksLikeStaleBuildError(undefined)).toBe(false);
    expect(looksLikeStaleBuildError({})).toBe(false);
  });
});

describe("shouldReloadForStaleBuild", () => {
  const anonymousCrash = new TypeError(
    "Cannot read properties of undefined (reading 'map')",
  );

  it("reloads when an asset 404'd, whatever the error says", () => {
    expect(
      shouldReloadForStaleBuild({
        assetFailed: true,
        error: anonymousCrash,
        now: 1_000,
        lastReloadAt: null,
      }),
    ).toBe(true);
  });

  it("reloads on a self-identifying chunk error with no 404 recorded", () => {
    expect(
      shouldReloadForStaleBuild({
        assetFailed: false,
        error: new Error("ChunkLoadError: Loading chunk 12 failed"),
        now: 1_000,
        lastReloadAt: null,
      }),
    ).toBe(true);
  });

  it("leaves ordinary crashes alone", () => {
    expect(
      shouldReloadForStaleBuild({
        assetFailed: false,
        error: anonymousCrash,
        now: 1_000,
        lastReloadAt: null,
      }),
    ).toBe(false);
  });

  it("does not loop when the reload did not help", () => {
    const now = 10_000_000;
    expect(
      shouldReloadForStaleBuild({
        assetFailed: true,
        error: anonymousCrash,
        now,
        lastReloadAt: now - (RELOAD_COOLDOWN_MS - 1),
      }),
    ).toBe(false);
  });

  it("allows another reload once the cooldown has passed", () => {
    const now = 10_000_000;
    expect(
      shouldReloadForStaleBuild({
        assetFailed: true,
        error: anonymousCrash,
        now,
        lastReloadAt: now - (RELOAD_COOLDOWN_MS + 1),
      }),
    ).toBe(true);
  });
});

describe("STALE_BUILD_WATCHER_SCRIPT", () => {
  /** Runs the inlined watcher against a stand-in window and returns it
   *  together with the `error` listener it registered. */
  function runWatcher() {
    const listeners: Array<(e: unknown) => void> = [];
    const win: Record<string, unknown> = {
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        if (type === "error") listeners.push(fn);
      },
    };
    new Function("window", STALE_BUILD_WATCHER_SCRIPT)(win);
    expect(listeners).toHaveLength(1);
    return { win, fire: listeners[0] };
  }

  it("sets the global the boundaries read", () => {
    expect(STALE_BUILD_WATCHER_SCRIPT).toContain(JSON.stringify(ASSET_FAILURE_GLOBAL));
  });

  it("is safe to inline in a <script> tag", () => {
    expect(STALE_BUILD_WATCHER_SCRIPT).not.toContain("</script");
  });

  it("flags a 404 on a build script or stylesheet", () => {
    const { win, fire } = runWatcher();
    fire({ target: { tagName: "SCRIPT", src: "/_next/static/chunks/23dphzdqxtiv6.js" } });
    expect(win[ASSET_FAILURE_GLOBAL]).toBe(true);

    const css = runWatcher();
    css.fire({
      target: { tagName: "LINK", href: "/_next/static/chunks/2j13i86rt3126.css" },
    });
    expect(css.win[ASSET_FAILURE_GLOBAL]).toBe(true);
  });

  it("ignores failures that are not this build's code", () => {
    const { win, fire } = runWatcher();
    // A broken <img>, and a CDN runtime we deliberately load off-origin.
    fire({ target: { tagName: "IMG", src: "/_next/static/chunks/a.js" } });
    fire({ target: { tagName: "SCRIPT", src: "https://cdn.jsdelivr.net/x.js" } });
    fire({ target: { tagName: "LINK", href: "/logo-files/SVG/logo.svg" } });
    expect(win[ASSET_FAILURE_GLOBAL]).toBeUndefined();
  });

  it("survives an event with no target", () => {
    const { win, fire } = runWatcher();
    expect(() => fire({})).not.toThrow();
    expect(win[ASSET_FAILURE_GLOBAL]).toBeUndefined();
  });
});
