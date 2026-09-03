/**
 * Shared intellisense wiring, pure-logic tests exercised through real
 * CodeMirror `EditorState`/`CompletionContext` instances (no DOM
 * needed): the member-position guard that keeps static keyword lists
 * out of `pd.|`-style positions, the PHP `$variable` document scanner,
 * and the runtime-item → CodeMirror completion mapping.
 */
import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { _internal } from "../app/_components/completion/languageCompletion";

const {
  PROFILES,
  phpVariableSource,
  inMemberPosition,
  toCmCompletion,
  lazySource,
  selectProfile,
  variantsOf,
} = _internal;

function contextAt(doc: string, pos: number, explicit = false) {
  return new CompletionContext(EditorState.create({ doc }), pos, explicit);
}

describe("inMemberPosition", () => {
  const py = selectProfile(PROFILES.python, undefined);

  it("detects a token right after a dot", () => {
    const doc = "df.hea";
    expect(
      inMemberPosition(contextAt(doc, doc.length), py.wordRe, py.memberEndings),
    ).toBe(true);
  });

  it("detects the empty token immediately after a dot", () => {
    const doc = "df.";
    expect(
      inMemberPosition(contextAt(doc, doc.length), py.wordRe, py.memberEndings),
    ).toBe(true);
  });

  it("is false for a top-level identifier", () => {
    const doc = "prin";
    expect(
      inMemberPosition(contextAt(doc, doc.length), py.wordRe, py.memberEndings),
    ).toBe(false);
  });

  it("supports multi-char endings like -> and ::", () => {
    const cpp = selectProfile(PROFILES.cpp, undefined);
    const arrow = "ptr->fo";
    expect(
      inMemberPosition(
        contextAt(arrow, arrow.length),
        cpp.wordRe,
        cpp.memberEndings,
      ),
    ).toBe(true);
    const scope = "std::so";
    // `::` extends into the cpp word regex? No, cpp words are \w only,
    // so the token is "so" and the text before it ends with "::".
    expect(
      inMemberPosition(
        contextAt(scope, scope.length),
        cpp.wordRe,
        cpp.memberEndings,
      ),
    ).toBe(true);
  });
});

describe("phpVariableSource", () => {
  const doc = `<?php
$count = 1;
$total = $count + 2;
echo $to`;

  it("suggests document variables and superglobals after $", async () => {
    const res = (await phpVariableSource(
      contextAt(doc, doc.length),
    )) as CompletionResult;
    expect(res).not.toBeNull();
    const labels = res.options.map((o) => o.label);
    expect(labels).toContain("$count");
    expect(labels).toContain("$total");
    expect(labels).toContain("$_GET");
    // The fragment being typed is not suggested back.
    expect(labels).not.toContain("$to");
    // Replacement starts at the "$".
    expect(res.from).toBe(doc.length - 3);
  });

  it("stays quiet with no token unless explicit", async () => {
    const bare = "echo 1 + ";
    expect(await phpVariableSource(contextAt(bare, bare.length))).toBeNull();
    const explicit = (await phpVariableSource(
      contextAt(bare, bare.length, true),
    )) as CompletionResult;
    expect(explicit.options.map((o) => o.label)).toContain("$_SERVER");
  });
});

describe("toCmCompletion", () => {
  it("wraps bare strings as variables", () => {
    expect(toCmCompletion("df")).toEqual({ label: "df", type: "variable" });
  });

  it("passes rich metadata through", () => {
    expect(
      toCmCompletion({
        label: "read_csv",
        type: "function",
        detail: "(path)",
        boost: 2,
      }),
    ).toMatchObject({
      label: "read_csv",
      type: "function",
      detail: "(path)",
      boost: 2,
    });
  });
});

describe("profiles", () => {
  it("covers every language adapter id", () => {
    for (const id of [
      "python",
      "r",
      "javascript",
      "typescript",
      "php",
      "c",
      "cpp",
      "java",
      "csharp",
    ]) {
      expect(PROFILES[id], `profile for ${id}`).toBeDefined();
    }
  });

  it("covers the multi-language surfaces added later", () => {
    expect(PROFILES.react, "profile for react").toBeDefined();
    expect(PROFILES.web, "profile for web").toBeDefined();
    // The web trio picks its profile per file.
    const html = selectProfile(PROFILES.web, "index.html");
    const css = selectProfile(PROFILES.web, "styles.css");
    const js = selectProfile(PROFILES.web, "script.js");
    expect(html).not.toBe(css);
    expect(css).not.toBe(js);
    expect(js).toBe(PROFILES.javascript);
    expect(html.triggerEndings).toContain("<");
    expect(css.triggerEndings).toContain(":");
    // No filename: HTML, the pane a fresh web workspace opens on.
    expect(selectProfile(PROFILES.web, undefined)).toBe(html);
    expect(variantsOf(PROFILES.web)).toHaveLength(4);
  });

  it("keeps trigger endings within member endings", () => {
    // A trigger that isn't also a member ending would auto-open a popup
    // in which the static keyword lists then fire, the exact noise the
    // guard exists to prevent.
    for (const [id, spec] of Object.entries(PROFILES)) {
      for (const profile of variantsOf(spec)) {
        for (const trigger of profile.triggerEndings) {
          expect(
            profile.memberEndings,
            `trigger "${trigger}" of ${id}`,
          ).toContain(trigger);
        }
      }
    }
  });
});

describe("lazySource", () => {
  it("answers the very first request once the chunk lands", async () => {
    let loads = 0;
    const source = lazySource(async () => {
      loads += 1;
      return (ctx) => ({ from: ctx.pos, options: [{ label: "printf" }] });
    });
    const doc = "pri";
    const first = await source(contextAt(doc, doc.length, true));
    expect((first as CompletionResult).options[0].label).toBe("printf");
    // The chunk is imported once and reused synchronously afterwards.
    const second = source(contextAt(doc, doc.length, true));
    expect(second).not.toBeInstanceOf(Promise);
    expect(loads).toBe(1);
  });

  it("stays silent when the chunk fails to load", async () => {
    const source = lazySource(async () => {
      throw new Error("chunk unavailable");
    });
    const doc = "pri";
    expect(await source(contextAt(doc, doc.length, true))).toBeNull();
    expect(await source(contextAt(doc, doc.length, true))).toBeNull();
  });
});

describe("phpVariableSource on explicit requests", () => {
  it("does not list superglobals behind a bare word", async () => {
    const doc = "<?php\narr";
    expect(await phpVariableSource(contextAt(doc, doc.length, true))).toBeNull();
  });
});
