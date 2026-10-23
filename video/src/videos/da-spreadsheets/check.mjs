// Computes every formula result the da-spreadsheets video shows and writes
// what came back to results.json, which data.ts reads.
//
// The Data Analyst spreadsheet page is pure concept (its formulas are shown,
// never run), and the site carries no formula engine, so these run in
// HyperFormula 3.5.0, a spreadsheet engine that follows Excel's function
// semantics, serial dates and reference rules. It is not a dependency of the
// repo: install it anywhere and point this script at it.
//
//   npm install --prefix /tmp/hf hyperformula@3.5.0
//   HYPERFORMULA_DIR=/tmp/hf node video/src/videos/da-spreadsheets/check.mjs
//
// Two spellings differ from Excel's and are translated on the way in: bare
// TRUE and FALSE are written TRUE() and FALSE() for the engine, and the
// formula stored and shown is Excel's. Fill-down and fill-across are done
// with the engine's own copy and paste, and a column insert with its own
// addColumns, so a reference that shifts (or doesn't) shifts as it would in
// Excel. A number stored as text is entered with Excel's leading apostrophe.
//
// The sheets are the video's own unless noted: the page gives formulas but no
// data. Its own examples (PROPER(TRIM("  aVA smith ")), the username before
// the @, TEXTJOIN, SUMIFS on "2024-03", the $F$1 tax rate) are used as given.
/* global console, process, URL */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.env.HYPERFORMULA_DIR;
if (!dir) {
  console.error("Set HYPERFORMULA_DIR to a folder where hyperformula@3.5.0 is installed (see the header).");
  process.exit(1);
}
const { HyperFormula } = createRequire(join(dir, "package.json"))("hyperformula");

/** Excel's spelling → the engine's: bare TRUE/FALSE outside strings become calls. */
const toEngine = (f) => f.replace(/("[^"]*")|\b(TRUE|FALSE)\b(?!\()/g, (m, s, b) => s ?? `${b}()`);
/** The engine's spelling → Excel's. */
const toExcel = (f) => f.replace(/("[^"]*")|\b(TRUE|FALSE)\(\)/g, (m, s, b) => s ?? b);

/** A1 notation ↔ the engine's {row, col}. */
const addr = (ref) => {
  const m = /^([A-Z]+)(\d+)$/.exec(ref);
  const col = [...m[1]].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;
  return { col, row: Number(m[2]) - 1 };
};

/** A value as the cell shows it: numbers and text as they are, an error as its code. */
const shown = (v) => (v !== null && typeof v === "object" ? { error: v.value } : v);

/** A workbook: { sheetName: rows }, rows written as a user types them. */
function book(sheets) {
  const hf = HyperFormula.buildEmpty({ licenseKey: "gpl-v3", dateFormats: ["YYYY-MM-DD"] });
  for (const [name, rows] of Object.entries(sheets)) {
    hf.addSheet(name);
    hf.setSheetContent(hf.getSheetId(name), rows.map((r) => r.map((c) => (typeof c === "string" && c.startsWith("=") ? toEngine(c) : c))));
  }
  const at = (sheet, ref) => ({ sheet: hf.getSheetId(sheet), ...addr(ref) });
  return {
    hf,
    set: (sheet, ref, formula) => hf.setCellContents(at(sheet, ref), [[toEngine(formula)]]),
    /** Copies one cell and pastes it into each target, as a fill does. */
    fill: (sheet, from, targets) => {
      hf.copy({ start: at(sheet, from), end: at(sheet, from) });
      for (const t of targets) hf.paste(at(sheet, t));
    },
    cell: (sheet, ref) => {
      const a = at(sheet, ref);
      const f = hf.getCellFormula(a);
      return { sheet, ref, formula: f ? toExcel(f) : null, value: shown(hf.getCellValue(a)) };
    },
    /** A sheet as displayed: every value, formulas evaluated. */
    values: (sheet) => hf.getSheetValues(hf.getSheetId(sheet)).map((r) => r.map(shown)),
  };
}

const results = { engine: `HyperFormula ${HyperFormula.version}`, figures: {} };

// ── The orders sheet: ten orders, three regions, three months ───────────────

const ORDERS = [
  ["id", "region", "month", "revenue"],
  [1, "North", "2024-01", 120],
  [2, "South", "2024-01", 80],
  [3, "North", "2024-02", 150],
  [4, "East", "2024-01", 95],
  [5, "South", "2024-02", 110],
  [6, "North", "2024-03", 200],
  [7, "East", "2024-02", 60],
  [8, "South", "2024-03", 140],
  [9, "North", "2024-03", 90],
  [10, "East", "2024-03", 175],
];

// 1, 2. The pivot: region down, month across, revenue summed, as SUMIFS with
//    mixed references filled across the grid (questions 2 and 7), then the
//    same cell as a count.
{
  const months = ["2024-01", "2024-02", "2024-03"];
  const regions = ["North", "South", "East"];
  const b = book({
    orders: [
      ...ORDERS.map((r, i) => [...r, null, i === 0 ? "region" : (regions[i - 1] ?? null), ...(i === 0 ? months : [])]),
    ],
  });
  const grid = ["G", "H", "I"].flatMap((c) => [2, 3, 4].map((r) => `${c}${r}`));
  b.set("orders", "G2", "=SUMIFS($D$2:$D$11,$B$2:$B$11,$F2,$C$2:$C$11,G$1)");
  b.fill("orders", "G2", grid.filter((r) => r !== "G2"));
  // The same grid with the summary switched to a count.
  const counts = book({ orders: ORDERS.map((r, i) => [...r, null, i === 0 ? "region" : (regions[i - 1] ?? null), ...(i === 0 ? months : [])]) });
  counts.set("orders", "G2", "=COUNTIFS($B$2:$B$11,$F2,$C$2:$C$11,G$1)");
  counts.fill("orders", "G2", grid.filter((r) => r !== "G2"));
  results.figures.pivot = {
    orders: ORDERS,
    regions,
    months,
    /** The cross-tab, region by month, each cell with the formula filled into it. */
    grid: regions.map((_, i) => ["G", "H", "I"].map((c) => b.cell("orders", `${c}${i + 2}`))),
    countGrid: regions.map((_, i) => ["G", "H", "I"].map((c) => counts.cell("orders", `${c}${i + 2}`))),
  };
}

// Rapid fire on the same orders: SUMIF and SUMIFS (the page's "2024-03"),
// COUNTIFS and AVERAGEIF, conditional formatting's rule, and a revenue typed
// as text (question 10).
{
  const b = book({ orders: ORDERS });
  b.set("orders", "F1", '=SUMIF(B2:B11,"North",D2:D11)');
  b.set("orders", "F2", '=SUMIFS(D2:D11,B2:B11,"North",C2:C11,"2024-03")');
  b.set("orders", "F3", '=COUNTIFS(B2:B11,"North",D2:D11,">100")');
  b.set("orders", "F4", '=AVERAGEIF(B2:B11,"North",D2:D11)');
  b.set("orders", "F5", "=SUM(D2:D11)");
  b.set("orders", "G2", "=D2>150");
  b.fill("orders", "G2", [3, 4, 5, 6, 7, 8, 9, 10, 11].map((r) => `G${r}`));
  results.figures.conditions = {
    sumif: b.cell("orders", "F1"),
    sumifs: b.cell("orders", "F2"),
    countifs: b.cell("orders", "F3"),
    averageif: b.cell("orders", "F4"),
    total: b.cell("orders", "F5"),
    /** The conditional-formatting rule, as a formula per row: TRUE lights the cell. */
    over150: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((r) => b.cell("orders", `G${r}`)),
  };
  // The same sheet with order 3's 150 typed as text: SUM skips it.
  const t = book({ orders: ORDERS.map((r, i) => (i === 3 ? [r[0], r[1], r[2], "'150"] : r)) });
  t.set("orders", "F5", "=SUM(D2:D11)");
  t.set("orders", "F6", "=ISTEXT(D4)");
  results.figures.conditions.textTotal = t.cell("orders", "F5");
  results.figures.conditions.textCell = t.cell("orders", "F6");
}

// ── The products sheet: lookups (questions 3 to 6, and 8) ───────────────────

const PRODUCTS = [
  ["sku", "name", "price"],
  ["P-101", "Notebook", 4.5],
  ["P-102", "Mug", 9],
  ["P-103", "Pen", 1.25],
  ["P-104", "Lamp", 24],
];
const TIERS = [
  ["from", "discount"],
  [0, 0],
  [100, 0.05],
  [500, 0.1],
  [1000, 0.15],
];
{
  const b = book({ products: PRODUCTS, calc: [[null]], tiers: TIERS });
  const formulas = {
    vlookup: '=VLOOKUP("P-102",products!A2:C5,3,FALSE)',
    // It looks only to the right of the key column: the name column isn't searched.
    leftward: '=VLOOKUP("Mug",products!A2:C5,1,FALSE)',
    indexMatchSku: '=INDEX(products!A2:A5,MATCH("Mug",products!B2:B5,0))',
    indexMatchPrice: '=INDEX(products!C2:C5,MATCH("P-102",products!A2:A5,0))',
    xlookupMissing: '=XLOOKUP("P-109",products!A2:A5,products!C2:C5,"Not found")',
    xlookupLeft: '=XLOOKUP("Mug",products!B2:B5,products!A2:A5)',
    exact: '=VLOOKUP("P-105",products!A2:C5,3,FALSE)',
    approxId: '=VLOOKUP("P-105",products!A2:C5,3)',
    approxTier: "=VLOOKUP(640,tiers!A2:B5,2,TRUE)",
    iferrorFound: '=IFERROR(VLOOKUP("P-102",products!A2:C5,2,FALSE),"Unknown")',
    iferrorMissing: '=IFERROR(VLOOKUP("P-109",products!A2:C5,2,FALSE),"Unknown")',
    iferrorSpace: '=IFERROR(VLOOKUP("P-102 ",products!A2:C5,2,FALSE),"Unknown")',
    iferrorBroken: '=IFERROR(VLOOKUP("P-102",products!A2:C5,4,FALSE),"Unknown")',
    broken: '=VLOOKUP("P-102",products!A2:C5,4,FALSE)',
    ifnaFound: '=IFNA(VLOOKUP("P-102",products!A2:C5,2,FALSE),"Unknown")',
    ifnaMissing: '=IFNA(VLOOKUP("P-109",products!A2:C5,2,FALSE),"Unknown")',
    ifnaSpace: '=IFNA(VLOOKUP("P-102 ",products!A2:C5,2,FALSE),"Unknown")',
    ifnaBroken: '=IFNA(VLOOKUP("P-102",products!A2:C5,4,FALSE),"Unknown")',
  };
  const ids = Object.keys(formulas);
  ids.forEach((id, i) => b.set("calc", `A${i + 1}`, formulas[id]));
  const before = Object.fromEntries(ids.map((id, i) => [id, b.cell("calc", `A${i + 1}`)]));
  // Insert a category column after the name, as someone tidying the sheet would.
  b.hf.addColumns(b.hf.getSheetId("products"), [2, 1]);
  const category = ["category", "Paper", "Kitchen", "Paper", "Home"];
  category.forEach((v, r) => b.hf.setCellContents({ sheet: b.hf.getSheetId("products"), row: r, col: 2 }, [[v]]));
  results.figures.lookups = {
    products: PRODUCTS,
    tiers: TIERS,
    ...before,
    inserted: b.values("products"),
    /** Every lookup again, after the insert: the engine rewrote their ranges
     *  as Excel would, and VLOOKUP's typed-in column number stayed 3. */
    after: Object.fromEntries(ids.map((id, i) => [id, b.cell("calc", `A${i + 1}`)])),
  };
}

// ── References: the page's $F$1 tax rate, filled down (question 7) ──────────

{
  const rows = [
    ["amount", "tax", null, null, "rate", 0.08],
    [100],
    [250],
    [80],
  ];
  const b = book({ sheet: rows });
  b.set("sheet", "B2", "=A2*$F$1");
  b.fill("sheet", "B2", ["B3", "B4"]);
  b.set("sheet", "C2", "=A2*F1");
  b.fill("sheet", "C2", ["C3", "C4"]);
  b.hf.addNamedExpression("TaxRate", "=sheet!$F$1");
  b.set("sheet", "D2", "=A2*TaxRate");
  b.fill("sheet", "D2", ["D3", "D4"]);
  results.figures.references = {
    rows,
    absolute: ["B2", "B3", "B4"].map((r) => b.cell("sheet", r)),
    relative: ["C2", "C3", "C4"].map((r) => b.cell("sheet", r)),
    named: ["D2", "D3", "D4"].map((r) => b.cell("sheet", r)),
  };
}

// ── Text, dates and duplicates (rapid fire) ─────────────────────────────────

{
  const emails = ["email", "ava@example.com", "ben@example.com", "ava@example.com", "cy@example.com"];
  const b = book({ calc: [[null]], emails: emails.map((e) => [e]) });
  const formulas = {
    clean: '=PROPER(TRIM("  aVA smith "))',
    username: '=LEFT("ava.smith@example.com",FIND("@","ava.smith@example.com")-1)',
    join: '=TEXTJOIN(" ",TRUE,"Ava","","Smith")',
    serial: "=DATE(2024,3,1)",
    days: "=DATE(2024,3,31)-DATE(2024,3,1)",
    datevalue: '=DATEVALUE("2024-03-01")',
  };
  Object.values(formulas).forEach((f, i) => b.set("calc", `A${i + 1}`, f));
  b.set("emails", "B2", "=COUNTIF($A$2:$A$5,A2)>1");
  b.fill("emails", "B2", ["B3", "B4", "B5"]);
  results.figures.text = {
    ...Object.fromEntries(Object.keys(formulas).map((id, i) => [id, b.cell("calc", `A${i + 1}`)])),
    emails,
    repeated: ["B2", "B3", "B4", "B5"].map((r) => b.cell("emails", r)),
  };
}

const out = new URL("./results.json", import.meta.url);
writeFileSync(out, `${JSON.stringify(results, null, 2)}\n`);
console.log(`wrote ${fileURLToPath(out)} (${results.engine})`);
