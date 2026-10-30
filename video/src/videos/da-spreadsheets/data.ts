import results from "./results.json" with { type: "json" };

// Every sheet, formula and result the video shows, read from results.json:
// what HyperFormula 3.5.0 (a spreadsheet engine that follows Excel's
// functions, serial dates and reference rules) computed for the workbooks in
// check.mjs, which wrote it. A formula filled down or across is the formula
// the engine's own fill wrote into that cell, so a listing cannot drift from
// what ran. Pure (no Remotion, no DOM).

export const VIDEO = "da-spreadsheets";

/**
 * Whether public/images/da-spreadsheets/ holds the watercolor from
 * illustrations.json. Every frame is laid out with room for it either way.
 */
export const ILLUSTRATIONS = true;

export type Value = number | string | boolean | { error: string } | null;
/** One computed cell: where it is, the formula in it (Excel's spelling), and what it shows. */
export type Cell = { sheet: string; ref: string; formula: string | null; value: Value };

type Figures = {
  pivot: {
    orders: (string | number)[][];
    regions: string[];
    months: string[];
    grid: Cell[][];
    countGrid: Cell[][];
  };
  conditions: Record<"sumif" | "sumifs" | "countifs" | "averageif" | "total" | "textTotal" | "textCell" | "textValue", Cell> & {
    over150: Cell[];
  };
  lookups: Record<string, Cell> & {
    products: (string | number)[][];
    tiers: (string | number)[][];
    inserted: Value[][];
    after: Record<string, Cell>;
  };
  references: { rows: (string | number | null)[][]; absolute: Cell[]; relative: Cell[]; named: Cell[] };
  text: Record<"clean" | "username" | "join" | "serial" | "days" | "datevalue", Cell> & {
    emails: string[];
    repeated: Cell[];
    /** COUNTIF($A$2:A2,A2)>1 filled down: only a later copy flags. */
    later: Cell[];
  };
};
const F = results.figures as unknown as Figures;

/** A cell's value as a spreadsheet prints it, before any number format. */
export const printed = (v: Value): string => {
  if (v === null) return "";
  if (typeof v === "object") return v.error;
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  return String(v);
};

/**
 * A formula as the figure prints it. The lookups ran from a separate "calc"
 * sheet, so their ranges carry a sheet name ("products!A2:C5"); each figure
 * draws the one sheet they read, where Excel would write the same formula
 * without it, so the prefix is dropped on screen. Question 8 draws a sheet of
 * its own results beside its lookups, so it keeps the prefix (c.formula).
 */
export const screen = (c: Cell): string => (c.formula ?? "").replace(/\b(products|tiers)!/g, "");

/** Whether a computed cell came back as an error (#N/A, #REF!). */
export const isError = (v: Value): v is { error: string } => typeof v === "object" && v !== null && "error" in v;

/** A cell's number, for a figure that draws it. */
export const num = (c: Cell): number => {
  if (typeof c.value !== "number") throw new Error(`${c.sheet}!${c.ref} is not a number: ${printed(c.value)}`);
  return c.value;
};

// ── 1, 2. The orders sheet and its pivot ────────────────────────────────────

export const PIVOT = F.pivot;

// ── 3 to 6, 8. Lookups on the products sheet ────────────────────────────────

export const LOOKUPS = F.lookups;

// ── 7. References, and the named range ──────────────────────────────────────

export const REFERENCES = F.references;

// ── Rapid fire ──────────────────────────────────────────────────────────────

export const CONDITIONS = F.conditions;
export const TEXT = F.text;

export const ENGINE = results.engine;
