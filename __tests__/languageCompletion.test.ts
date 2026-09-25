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
});

describe("profiles", () => {
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
  it("stays silent when the chunk fails to load", async () => {
    const source = lazySource(async () => {
      throw new Error("chunk unavailable");
    });
    const doc = "pri";
    expect(await source(contextAt(doc, doc.length, true))).toBeNull();
    expect(await source(contextAt(doc, doc.length, true))).toBeNull();
  });
});
