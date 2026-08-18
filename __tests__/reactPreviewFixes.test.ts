/**
 * The React playground's runtime pieces. esbuild-wasm and esm.sh both come
 * from a CDN, so the browser path cannot run in CI at all; these exercise
 * the same modules the adapter calls, against a real esbuild-produced
 * source map and a stubbed fetch.
 */
import { describe, expect, it, beforeEach } from "vitest";

import {
  bundleLineOf,
  inlineSourceMapOf,
  parseSourceMap,
} from "../app/_components/runtime/bundleSourceMap";
import {
  externalSpecifiers,
  packageNameFromUrl,
  preflightModules,
  resetPreflightCache,
} from "../app/_components/runtime/reactModulePreflight";
import {
  composeReactDocumentWithMeta,
} from "../app/_components/runtime/webPreview";

describe("bundle source maps", () => {
  // A hand-built map: generated line 3 column 0 → App.tsx line 2 column 4.
  const map = {
    version: 3,
    sources: ["dataslope://preview/App.tsx", "dataslope://preview/main.tsx"],
    mappings: ";;AAEI;;ACAA",
    names: [],
  };

  it("maps a generated position back to its source", () => {
    const parsed = parseSourceMap(JSON.stringify(map));
    expect(parsed).not.toBeNull();
    const at = parsed!.lookup(3, 1);
    expect(at).toEqual({ file: "App.tsx", line: 3, column: 5 });
  });

  it("moves to the second source once the map does", () => {
    const parsed = parseSourceMap(JSON.stringify(map))!;
    expect(parsed.lookup(5, 1)?.file).toBe("main.tsx");
  });

  it("answers nothing for a line the map does not cover", () => {
    const parsed = parseSourceMap(JSON.stringify(map))!;
    expect(parsed.lookup(99, 1)).toBeNull();
  });

  it("refuses a malformed map rather than inventing a location", () => {
    expect(parseSourceMap("not json")).toBeNull();
    expect(parseSourceMap('{"mappings":123}')).toBeNull();
    expect(inlineSourceMapOf("const a = 1;\n")).toBeNull();
  });

  it("reads the inline map esbuild appends", () => {
    const base64 = Buffer.from(JSON.stringify(map), "utf8").toString("base64");
    const bundle = `const a = 1;\n//# sourceMappingURL=data:application/json;base64,${base64}\n`;
    const parsed = inlineSourceMapOf(bundle);
    expect(parsed?.lookup(3, 1)?.file).toBe("App.tsx");
  });

  it("counts bundle lines from where the bundle starts in the document", () => {
    const { doc, bundleStartLine } = composeReactDocumentWithMeta({
      js: "line1();\nline2();\nline3();\n",
      token: "t",
    });
    const docLines = doc.split("\n");
    expect(docLines[bundleStartLine - 1]).toBe("line1();");
    expect(bundleLineOf(bundleStartLine + 2, bundleStartLine)).toBe(3);
  });
});

// The decoder has to agree with the compiler that writes the maps, not
// just with a hand-built one, so this builds a real bundle.
describe("against a real esbuild bundle", () => {
  it("points a bundle position at the .tsx line it came from", async () => {
    const esbuild = await import("esbuild-wasm");
    const { REACT_BUILD_OPTIONS, splitBundleOutput, vfsPlugin } = await import(
      "../app/_components/runtime/reactBundle"
    );
    // Browser-only option omitted: under Node the package finds its wasm.
    await esbuild.initialize({});

    const files = new Map([
      ["main.tsx", 'import { App } from "./App";\nconsole.log(App);\n'],
      [
        "App.tsx",
        "function Inner() {\n" +
          "  const obj: any = null;\n" +
          "  return obj.missingProperty;\n" +
          "}\n" +
          "\n" +
          "export function App() {\n" +
          "  return Inner();\n" +
          "}\n",
      ],
    ]);
    const result = await esbuild.build({
      ...REACT_BUILD_OPTIONS,
      entryPoints: ["main.tsx"],
      plugins: [vfsPlugin(files)],
    } as unknown as Parameters<typeof esbuild.build>[0]);
    const { js } = splitBundleOutput(
      result.outputFiles as unknown as Parameters<typeof splitBundleOutput>[0],
    );

    const map = inlineSourceMapOf(js);
    expect(map).not.toBeNull();

    const { doc, bundleStartLine } = composeReactDocumentWithMeta({ js, token: "t" });
    const bundleLines = js.split("\n");
    const generated = bundleLines.findIndex((l) => l.includes("missingProperty"));
    expect(generated).toBeGreaterThan(-1);
    const column = bundleLines[generated].indexOf("missingProperty") + 1;

    // The frame reports a line of the composed document, not of the bundle.
    const documentLine = bundleStartLine + generated;
    expect(doc.split("\n")[documentLine - 1]).toBe(bundleLines[generated]);

    const at = map!.lookup(bundleLineOf(documentLine, bundleStartLine), column);
    expect(at?.file).toBe("App.tsx");
    expect(at?.line).toBe(3);
  }, 60_000);
});

describe("module preflight", () => {
  beforeEach(() => resetPreflightCache());

  it("finds the packages a bundle imports", () => {
    const bundle = [
      'import { jsx } from "https://esm.sh/react@19.2.8/jsx-runtime";',
      'import clsx from "clsx";',
      'import "./local.css";',
      'const lazy = await import("dayjs");',
    ].join("\n");
    const urls = externalSpecifiers(bundle);
    expect(urls).toContain("https://esm.sh/react@19.2.8/jsx-runtime");
    expect(urls.some((u) => u.includes("/clsx"))).toBe(true);
    expect(urls.some((u) => u.includes("/dayjs"))).toBe(true);
    expect(urls.some((u) => u.includes("local.css"))).toBe(false);
  });

  it("names the package a 404 came from", async () => {
    const failures = await preflightModules(
      ["https://esm.sh/this-package-does-not-exist-abc123?deps=react@19.2.8"],
      (async () => new Response(null, { status: 404 })) as unknown as typeof fetch,
    );
    expect(failures).toHaveLength(1);
    expect(failures[0].status).toBe(404);
    expect(failures[0].message).toContain(
      'Cannot resolve "this-package-does-not-exist-abc123"',
    );
    expect(failures[0].message).toContain("404");
  });

  it("says a blocked network is a network problem, not a missing package", async () => {
    const failures = await preflightModules(
      ["https://esm.sh/clsx?deps=react@19.2.8"],
      (async () => {
        throw new TypeError("Failed to fetch");
      }) as unknown as typeof fetch,
    );
    expect(failures[0].status).toBe(0);
    expect(failures[0].message).toContain("Could not reach");
    expect(failures[0].message).not.toContain("Cannot resolve");
  });

  it("passes a reachable package and does not re-check it", async () => {
    let calls = 0;
    const ok = (async () => {
      calls += 1;
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;
    const url = "https://esm.sh/clsx?deps=react@19.2.8";
    expect(await preflightModules([url], ok)).toEqual([]);
    expect(await preflightModules([url], ok)).toEqual([]);
    expect(calls).toBe(1);
  });

  it("reads a package name out of an esm.sh URL", () => {
    expect(packageNameFromUrl("https://esm.sh/clsx?deps=react@19.2.8")).toBe("clsx");
    expect(packageNameFromUrl("https://esm.sh/react@19.2.8/jsx-runtime")).toBe("react");
    expect(packageNameFromUrl("https://esm.sh/@scope/pkg@1.0.0/sub")).toBe("@scope/pkg");
  });
});
