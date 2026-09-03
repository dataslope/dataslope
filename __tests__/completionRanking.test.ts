/**
 * The popup ordering signals: source tier, locality (names already in the
 * document) and recency (what the reader accepted last), and the clamp
 * that keeps them from outranking a better fuzzy match.
 */
import { describe, expect, it } from "vitest";
import { EditorState } from "@codemirror/state";
import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";

import {
  _internal,
  documentIdentifiers,
  RANK,
  ranked,
  rankResult,
  recencyBoost,
  rememberPicked,
} from "../app/_components/completion/ranking";

function contextAt(doc: string, pos = doc.length) {
  return new CompletionContext(EditorState.create({ doc }), pos, false);
}

describe("documentIdentifiers", () => {
  it("collects identifier-shaped words once per document version", () => {
    const state = EditorState.create({ doc: "total = count + 1\nprint(total)" });
    const ids = documentIdentifiers(state.doc);
    expect([...ids]).toEqual(expect.arrayContaining(["total", "count", "print"]));
    expect(ids.has("1")).toBe(false);
    expect(documentIdentifiers(state.doc)).toBe(ids);
  });
});

describe("rankResult", () => {
  const result: CompletionResult = {
    from: 0,
    options: [{ label: "print" }, { label: "printf", boost: 2 }, { label: "pri" }],
  };

  it("adds the tier and the locality bonus for names in the document", () => {
    const ctx = contextAt("print(x)\npri");
    const ranked_ = rankResult(result, ctx, RANK.builtin);
    const by = Object.fromEntries(ranked_.options.map((o) => [o.label, o.boost ?? 0]));
    expect(by.print).toBe(_internal.LOCALITY_BOOST);
    expect(by.printf).toBe(2);
  });

  it("skips locality when asked, and keeps the own boost otherwise", () => {
    const ctx = contextAt("print(x)\npri");
    const by = Object.fromEntries(
      rankResult(result, ctx, RANK.docWord, { locality: false }).options.map((o) => [o.label, o.boost ?? 0]),
    );
    expect(by.print).toBe(RANK.docWord);
    expect(by.printf).toBe(RANK.docWord + 2);
  });

  it("clamps so a tier can never outrank a better match", () => {
    const ctx = contextAt("");
    const huge: CompletionResult = { from: 0, options: [{ label: "x", boost: 99 }] };
    expect(rankResult(huge, ctx, 30).options[0].boost).toBe(_internal.MAX_BOOST);
  });
});

describe("recency", () => {
  it("boosts the most recent picks and decays with age", () => {
    _internal.recent.length = 0;
    rememberPicked("alpha");
    rememberPicked("beta");
    expect(recencyBoost("beta")).toBeGreaterThanOrEqual(recencyBoost("alpha"));
    expect(recencyBoost("alpha")).toBeGreaterThan(0);
    expect(recencyBoost("gamma")).toBe(0);
    for (let i = 0; i < 20; i++) rememberPicked(`name${i}`);
    expect(recencyBoost("alpha")).toBe(1);
    _internal.recent.length = 0;
  });
});

describe("ranked", () => {
  it("wraps sync and async sources and passes null through", async () => {
    const sync = ranked(() => ({ from: 0, options: [{ label: "a" }] }), RANK.local);
    expect((sync(contextAt("")) as CompletionResult).options[0].boost).toBe(RANK.local);
    const async_ = ranked(async () => ({ from: 0, options: [{ label: "a" }] }), RANK.keyword);
    expect(((await async_(contextAt(""))) as CompletionResult).options[0].boost).toBe(RANK.keyword);
    const empty = ranked(() => null, RANK.local);
    expect(empty(contextAt(""))).toBeNull();
  });
});
