import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";

/**
 * Cascade-parity regression: the app has two Tailwind roots (app/tailwind.css
 * and app/docs.css). After a client-side navigation both stylesheets can be
 * applied at once and the App Router does not guarantee <link> order, so for
 * same-layer, same-specificity rules the later sheet wins. The invariant that
 * makes ordering harmless: both roots must generate the SAME utility layer
 * (same class set, rule text, and relative order), implemented by the shared
 * @source list in app/tailwind.shared.css. Past bugs in this class: #528
 * (black borders), #541 (mobile navbar on desktop), /admin tables vanishing
 * after /admin → /learn → back. Allowed divergence: Fumadocs-theme utilities
 * (bg-fd-*, prose, …), which never share a CSS property with a generic
 * utility on the same element and so can't lose an ordering race.
 */

const ROOT = path.resolve(__dirname, "..");

/** Compile a Tailwind root exactly the way Next's PostCSS pipeline would. */
async function compile(file: string): Promise<string> {
  const css = readFileSync(file, "utf8");
  const result = await postcss([tailwindPostcss({ base: ROOT })]).process(css, {
    from: file,
  });
  return result.css;
}

/**
 * Extract the top-level rules of `@layer utilities` in source order as
 * [className, normalizedRuleText] pairs. Only single-class selectors are
 * class-keyed; anything else keeps its raw selector as the key.
 */
function utilityRules(css: string): Array<[string, string]> {
  const root = postcss.parse(css);
  const rules: Array<[string, string]> = [];
  root.walkAtRules("layer", (at) => {
    if (!/utilities/.test(at.params)) return;
    at.each((node) => {
      if (node.type !== "rule") return;
      const m = node.selector.match(/^\.((?:[\w-]|\\.)+)$/);
      const name = m ? m[1].replace(/\\/g, "") : node.selector;
      rules.push([name, node.toString().replace(/\s+/g, " ")]);
    });
  });
  return rules;
}

/** Learn-only utilities must be Fumadocs-theme/plugin-dependent. The optional
 *  leading `.` covers rules keyed by raw selector: newer fumadocs-ui desugars
 *  `.prose-no-margin { & > :first-child }` into plain child selectors. */
const FUMADOCS_ONLY = /fd-|^\.?prose(-|$)|^not-prose$/;

describe("Tailwind root cascade parity (app/tailwind.css vs app/docs.css)", () => {
  let tw: Array<[string, string]>;
  let learn: Array<[string, string]>;
  let twMap: Map<string, string>;
  let learnMap: Map<string, string>;

  beforeAll(async () => {
    const [twCss, learnCss] = await Promise.all([
      compile(path.join(ROOT, "app/tailwind.css")),
      compile(path.join(ROOT, "app/docs.css")),
    ]);
    tw = utilityRules(twCss);
    learn = utilityRules(learnCss);
    twMap = new Map(tw);
    learnMap = new Map(learn);
  }, 120_000);

  it("generates utilities (sanity check that both roots compiled)", () => {
    expect(tw.length).toBeGreaterThan(500);
    expect(learn.length).toBeGreaterThan(500);
  });

  it("every utility in the non-learn root also exists in the learn root", () => {
    const twOnly = tw.filter(([name]) => !learnMap.has(name)).map(([n]) => n);
    expect(twOnly).toEqual([]);
  });

  it("utilities that exist only in the learn root are Fumadocs-specific", () => {
    const learnOnly = learn
      .filter(([name]) => !twMap.has(name))
      .map(([n]) => n)
      .filter((n) => !FUMADOCS_ONLY.test(n));
    expect(learnOnly).toEqual([]);
  });

  it("shared utilities compile to identical rule text in both roots", () => {
    const diffs: string[] = [];
    for (const [name, text] of tw) {
      const other = learnMap.get(name);
      if (other !== undefined && other !== text) diffs.push(name);
    }
    expect(diffs).toEqual([]);
  });

  it("shared utilities appear in the same relative order in both roots", () => {
    const sharedInTwOrder = tw.filter(([n]) => learnMap.has(n)).map(([n]) => n);
    const sharedInLearnOrder = learn
      .filter(([n]) => twMap.has(n))
      .map(([n]) => n);
    expect(sharedInLearnOrder).toEqual(sharedInTwOrder);
  });
});
