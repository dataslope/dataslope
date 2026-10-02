import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  MAX_EDITOR_FRACTION,
  MIN_EDITOR_FRACTION,
  clampEditorFraction,
  editorSplitStyle,
  parseEditorFraction,
} from "@/app/_components/sql/utils/editorSplit";

const PLAYGROUNDS = [
  "app/_components/sql/SqlPlayground.tsx",
  "app/_components/duckdb/DuckDbPlayground.tsx",
  "app/_components/postgres/PostgresPlayground.tsx",
];

describe("editor/results split", () => {
  it("clamps a drag so neither pane can disappear", () => {
    expect(clampEditorFraction(-1)).toBe(MIN_EDITOR_FRACTION);
    expect(clampEditorFraction(2)).toBe(MAX_EDITOR_FRACTION);
    expect(clampEditorFraction(0.4)).toBe(0.4);
  });

  it("treats a missing or corrupt persisted value as absent", () => {
    expect(parseEditorFraction(null)).toBeNull();
    expect(parseEditorFraction("")).toBeNull();
    expect(parseEditorFraction("abc")).toBeNull();
    expect(parseEditorFraction("NaN")).toBeNull();
    expect(parseEditorFraction("0.01")).toBeNull();
    expect(parseEditorFraction("0.99")).toBeNull();
    expect(parseEditorFraction("0.42")).toBe(0.42);
  });

  it("leaves the stylesheet default in place until the user drags", () => {
    expect(editorSplitStyle(null)).toBeUndefined();
    expect(editorSplitStyle(0.25)).toEqual({
      "--sql-editor-fr": "0.25fr",
      "--sql-results-fr": "0.75fr",
    });
  });

  // An inline `grid-template-rows` outranks the per-tab layouts in
  // sqlPlayground.css, so each playground used to wipe it whenever a table
  // view or ER diagram opened, and the query tab came back at the default
  // height. The split now travels as custom properties the grid reads.
  it.each(PLAYGROUNDS)("%s never writes the pane tracks inline", (file) => {
    const source = readFileSync(path.join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/gridTemplateRows/);
    expect(source).toMatch(/useEditorResultsSplit\(/);
    expect(source).toMatch(/style=\{panesSplitStyle\}/);
  });

  it("the stylesheet sizes both pane tracks from the split properties", () => {
    const css = readFileSync(
      path.join(process.cwd(), "app/_components/sqlPlayground.css"),
      "utf8",
    );
    const panes = css.match(/^\.sql-panes \{[^}]*\}/m)?.[0] ?? "";
    expect(panes).toMatch(/var\(--sql-editor-fr, [\d.]+fr\)/);
    expect(panes).toMatch(/var\(--sql-results-fr, [\d.]+fr\)/);
    const postgres = css.match(/^\.postgres-panes \{[^}]*\}/m)?.[0] ?? "";
    expect(postgres).toMatch(/var\(--sql-editor-fr, [\d.]+fr\)/);
  });
});
