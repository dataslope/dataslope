/**
 * AI inline completion — client-side suggestion state machine.
 *
 * The ghost-text rendering and the fetch plugin need a browser, but the
 * subtle part — how an active suggestion reacts to further editing — is pure
 * `EditorState` logic and runs in Node: type-through consumption, and
 * clearing on any edit or cursor move that invalidates the suggestion.
 */
import { describe, it, expect } from "vitest";
import { EditorState } from "@codemirror/state";
import {
  aiInlineCompletion,
  _internal,
} from "../app/_components/ai/inlineCompletion";

const { suggestionField, setSuggestion } = _internal;

/** An editor state with the extension mounted, a doc, and a cursor. */
function editor(doc: string, cursor: number): EditorState {
  return EditorState.create({
    doc,
    selection: { anchor: cursor },
    extensions: [aiInlineCompletion({ language: "python" })],
  });
}

/** Apply the suggestion "arrived" effect the fetch plugin would dispatch. */
function suggest(state: EditorState, text: string, pos: number): EditorState {
  return state.update({ effects: setSuggestion.of({ text, pos }) }).state;
}

describe("suggestion state", () => {
  const doc = "def add(a, b):\n    ";
  const cursor = doc.length;

  it("stores a suggestion at the cursor", () => {
    const state = suggest(editor(doc, cursor), "return a + b", cursor);
    expect(state.field(suggestionField)).toEqual({
      text: "return a + b",
      pos: cursor,
    });
  });

  it("advances as the user types through matching characters", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({
      changes: { from: cursor, insert: "re" },
      selection: { anchor: cursor + 2 },
      userEvent: "input.type",
    }).state;
    expect(state.field(suggestionField)).toEqual({
      text: "turn a + b",
      pos: cursor + 2,
    });
  });

  it("clears when the user types a non-matching character", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({
      changes: { from: cursor, insert: "x" },
      selection: { anchor: cursor + 1 },
      userEvent: "input.type",
    }).state;
    expect(state.field(suggestionField)).toBeNull();
  });

  it("clears when the user types the entire suggestion", () => {
    let state = suggest(editor(doc, cursor), "ret", cursor);
    state = state.update({
      changes: { from: cursor, insert: "ret" },
      selection: { anchor: cursor + 3 },
      userEvent: "input.type",
    }).state;
    expect(state.field(suggestionField)).toBeNull();
  });

  it("clears on edits elsewhere in the document", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({
      changes: { from: 0, insert: "# comment\n" },
    }).state;
    expect(state.field(suggestionField)).toBeNull();
  });

  it("clears on deletion", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({
      changes: { from: cursor - 1, to: cursor },
      userEvent: "delete.backward",
    }).state;
    expect(state.field(suggestionField)).toBeNull();
  });

  it("clears when the cursor moves away", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({ selection: { anchor: 0 } }).state;
    expect(state.field(suggestionField)).toBeNull();
  });

  it("survives a selection set to the same position", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({ selection: { anchor: cursor } }).state;
    expect(state.field(suggestionField)).not.toBeNull();
  });

  it("replaces an active suggestion when a new one arrives", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = suggest(state, "return a - b", cursor);
    expect(state.field(suggestionField)?.text).toBe("return a - b");
  });

  it("clears via the dismiss effect", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    state = state.update({ effects: setSuggestion.of(null) }).state;
    expect(state.field(suggestionField)).toBeNull();
  });

  it("accepting inserts the text and clears (the Tab handler's transaction)", () => {
    let state = suggest(editor(doc, cursor), "return a + b", cursor);
    const s = state.field(suggestionField)!;
    state = state.update({
      changes: { from: s.pos, insert: s.text },
      selection: { anchor: s.pos + s.text.length },
      effects: setSuggestion.of(null),
      userEvent: "input.complete",
    }).state;
    expect(state.doc.toString()).toBe("def add(a, b):\n    return a + b");
    expect(state.field(suggestionField)).toBeNull();
  });
});
