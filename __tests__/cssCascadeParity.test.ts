import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindPostcss from "@tailwindcss/postcss";

/**
 * Cross-stylesheet cascade-parity regression test.
 *
 * The app has two Tailwind roots, app/tailwind.css (home, /pricing,
 * /account, /admin, legal) and app/docs.css (/courses lessons, /fumadocs-dev, /interview-prep).
 * After a client-side navigation BOTH stylesheets can be applied to the
 * document at once, and the App Router does not guarantee which <link> ends
 * up later in <head>: the order follows the user's navigation history.
 * Both roots emit into the same cascade layers, and for two same-layer,
 * same-specificity rules the later stylesheet wins.
 *
 * The invariant that makes that ordering harmless: both roots must generate
 * the SAME utility layer (identical class set, identical rule text,
 * identical relative order). Then whichever sheet the router puts last, every
 * base/variant pair (`hidden md:block`, `flex md:hidden`, `block
 * dark:hidden`, …) resolves identically. The invariant is implemented by the
 * shared @source list in app/tailwind.shared.css; this test fails if the two
 * roots ever drift apart (e.g. someone adds an @source glob or a
 * @custom-variant to one root only).
 *
 * Historical bugs in this class: #528 (intermittent black borders on /learn),
 * #541 (mobile navbar leaking onto desktop, slicing the top of /learn), and,
 * before the shared list existed, /admin's desktop tables vanishing after
 * /admin → /learn → back (the learn sheet's later `hidden` copy beat the
 * admin sheet's `md:block`).
 *
 * Allowed divergence: utilities that only compile in the learn root because
 * they depend on Fumadocs's theme/plugins (`bg-fd-*`, `prose`, `fd-steps`, …).
 * Those style Fumadocs-only chrome and never share a CSS property with a
 * generic utility on the same element, so they can't lose a cross-sheet
 * ordering race the way display/spacing pairs can.
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

/** Learn-only utilities must be Fumadocs-theme/plugin-dependent.
 *
 * The optional leading `.` is for rules `utilityRules` keys by raw selector
 * rather than by class, i.e. anything that isn't a lone class. fumadocs-ui
 * ≤16.9 wrote `.prose-no-margin { & > :first-child { … } }`, one class-keyed
 * rule; 16.14 emits the same styling desugared into
 * `.prose-no-margin > :first-child` and `… > :last-child`, which arrive here
 * as selectors. Same Fumadocs-only prose rule either way. */
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
