/**
 * The key bindings every SQL editor (playgrounds, challenge cards, embedded
 * code blocks) registers for its intellisense popup. Tab used to be the only
 * key that took a suggestion, which is not what an editor's autocomplete
 * does; Enter accepts as well, and still inserts a newline when no popup is
 * open because `acceptCompletion` reports "not handled" there and the binding
 * falls through to `defaultKeymap`.
 */
import { describe, expect, it } from "vitest";
import { acceptCompletion, completionKeymap } from "@codemirror/autocomplete";
import { sqlCompletionKeymap } from "../app/_components/sql/shared/editorSetup";

function bindingsFor(key: string) {
  return sqlCompletionKeymap.filter((b) => b.key === key);
}

describe("sqlCompletionKeymap", () => {
  it("accepts the highlighted suggestion on Enter", () => {
    const enter = bindingsFor("Enter");
    expect(enter).toHaveLength(1);
    expect(enter[0].run).toBe(acceptCompletion);
  });

  it("still accepts on Tab", () => {
    const tab = bindingsFor("Tab");
    expect(tab).toHaveLength(1);
    expect(tab[0].run).toBe(acceptCompletion);
  });

  it("keeps CodeMirror's own popup navigation keys", () => {
    // Arrows and PageUp/Down move the selection, Escape closes the popup.
    for (const key of ["ArrowDown", "ArrowUp", "Escape"]) {
      expect(bindingsFor(key)).toHaveLength(1);
    }
    // Everything the upstream keymap binds except its Enter, which is
    // re-added above so it sits behind each editor's Mod-Enter → Run.
    const upstream = completionKeymap.filter((b) => b.key !== "Enter").length;
    expect(sqlCompletionKeymap).toHaveLength(upstream + 2);
  });
});
