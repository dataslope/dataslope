/** Reading an Excel workbook in the browser.
 *
 *  The playgrounds could already *write* .xlsx (wasm-xlsxwriter) but had no
 *  way to read one, so a dropped workbook had nowhere to go. An .xlsx file is
 *  a zip of XML parts, and jszip is already a dependency, so the reader is
 *  the XML: the workbook's sheet list, the shared-string table, the number
 *  formats that distinguish a date from the number it is stored as, and each
 *  sheet's cells.
 *
 *  Scope: cell *values*, which is what a table import needs. Formulas come
 *  back as the value Excel last cached for them, and formatting, merges and
 *  charts are ignored.
 */

import type JSZipType from "jszip";

export interface XlsxSheet {
  /** The sheet's tab name, as shown in Excel. */
  name: string;
  /** First non-empty row, used as the column headers. */
  headers: string[];
  /** Every row after the header, padded to the header width. */
  rows: string[][];
}

/** A cell as the reader sees it before it becomes a string. */
type CellValue = string | number | boolean | null;

// ── XML scanning ─────────────────────────────────────────────────────────
// A regex scan rather than DOMParser: worksheets are a flat, machine-written
// shape, the parts can be tens of megabytes (DOM would build a node per
// cell), and it keeps the reader testable outside a browser.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Resolve XML entities, including numeric ones. */
export function decodeXmlEntities(text: string): string {
  if (!text.includes("&")) return text;
  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, body: string) => {
    if (body.startsWith("#")) {
      const code = body.startsWith("#x") || body.startsWith("#X")
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[body] ?? whole;
  });
}

/** Value of one attribute on an element's opening tag. */
function attr(tag: string, name: string): string | null {
  const m = new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`).exec(tag);
  return m ? decodeXmlEntities(m[1]) : null;
}

/** Every `<tag …>…</tag>` (and self-closing `<tag …/>`) in document order,
 *  as [openingTag, innerXml] pairs. */
function* elements(
  xml: string,
  tag: string,
): Generator<[string, string], void, undefined> {
  const re = new RegExp(`<${tag}(\\s[^>]*?)?(/)?>`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const open = m[0];
    if (m[2]) {
      yield [open, ""];
      continue;
    }
    const close = xml.indexOf(`</${tag}>`, re.lastIndex);
    if (close === -1) {
      yield [open, xml.slice(re.lastIndex)];
      return;
    }
    yield [open, xml.slice(re.lastIndex, close)];
    re.lastIndex = close + tag.length + 3;
  }
}

/** Concatenated text of every `<t>` in a fragment: a shared string is either
 *  one `<t>` or a series of `<r>` runs, each with its own. */
function textOf(fragment: string): string {
  let out = "";
  for (const [, inner] of elements(fragment, "t")) out += decodeXmlEntities(inner);
  return out;
}

// ── Dates ────────────────────────────────────────────────────────────────

/** Built-in number-format ids that mean "date" or "time" (ECMA-376 §18.8.30). */
const BUILTIN_DATE_FORMATS = new Set([
  14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47,
]);

/** A custom format string is a date format when it uses date/time tokens
 *  outside its literal sections. Colour and condition sections in brackets,
 *  and quoted literals, are stripped first so `[Red]0.00` or `"May"0` do not
 *  count. */
export function isDateFormat(code: string): boolean {
  const bare = code
    .replace(/\[[^\]]*\]/g, "")
    .replace(/"[^"]*"/g, "")
    .replace(/\\./g, "");
  return /[ymdhs]/i.test(bare);
}

/** Excel counts days from 1900-01-01 = 1, but also believes 1900 was a leap
 *  year: serial 60 is a 29th of February that never happened. Every serial
 *  after it is therefore one day ahead of a real count, which the usual
 *  1899-12-30 anchor cancels out. Below 60 the phantom day has not happened
 *  yet, so those serials need the day back. */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
const MS_PER_DAY = 86_400_000;
const PHANTOM_LEAP_SERIAL = 60;

/** Render an Excel date serial as ISO. Whole days become `YYYY-MM-DD`; a
 *  fractional part means the cell carries a time, so it keeps one. */
export function excelSerialToIso(serial: number): string {
  if (!Number.isFinite(serial)) return String(serial);
  // Excel displays serial 60 as 29 February 1900. No real date maps to it,
  // so it is written out literally rather than sliding into 1 March, which
  // is serial 61's day.
  if (Math.floor(serial) === PHANTOM_LEAP_SERIAL) {
    const time = serial - PHANTOM_LEAP_SERIAL;
    return time > 0
      ? `1900-02-29 ${new Date(Math.round(time * MS_PER_DAY))
          .toISOString()
          .slice(11, 19)}`
      : "1900-02-29";
  }
  const adjusted = serial < PHANTOM_LEAP_SERIAL ? serial + 1 : serial;
  const date = new Date(EXCEL_EPOCH_MS + Math.round(adjusted * MS_PER_DAY));
  const iso = date.toISOString();
  const wholeDay = Math.abs(serial - Math.floor(serial)) < 1e-9;
  return wholeDay ? iso.slice(0, 10) : iso.slice(0, 19).replace("T", " ");
}

// ── Sheet parsing ────────────────────────────────────────────────────────

/** Zero-based column index from a cell reference ("A1" → 0, "AB7" → 27). */
export function columnIndexFromRef(ref: string): number {
  let index = 0;
  for (const ch of ref) {
    const code = ch.charCodeAt(0);
    if (code < 65 || code > 90) break; // hit the row digits
    index = index * 26 + (code - 64);
  }
  return index - 1;
}

interface SheetContext {
  sharedStrings: string[];
  /** numFmtId per cell-format (`s` attribute) index. */
  styleFormats: number[];
  /** Format code per numFmtId, for the custom ones. */
  customFormats: Map<number, string>;
}

function isDateStyle(styleIndex: number | null, ctx: SheetContext): boolean {
  if (styleIndex === null) return false;
  const numFmtId = ctx.styleFormats[styleIndex];
  if (numFmtId === undefined) return false;
  if (BUILTIN_DATE_FORMATS.has(numFmtId)) return true;
  const code = ctx.customFormats.get(numFmtId);
  return code ? isDateFormat(code) : false;
}

/** One cell's value, resolved through the shared-string table and the number
 *  formats. */
function cellValue(open: string, inner: string, ctx: SheetContext): CellValue {
  const type = attr(open, "t") ?? "n";
  if (type === "inlineStr") return textOf(inner);
  if (type === "s") {
    const raw = firstTagText(inner, "v");
    const index = raw === null ? Number.NaN : Number(raw);
    return Number.isInteger(index) ? ctx.sharedStrings[index] ?? "" : "";
  }
  const raw = firstTagText(inner, "v");
  if (raw === null) return null;
  if (type === "str") return decodeXmlEntities(raw); // cached formula string
  if (type === "b") return raw === "1";
  if (type === "e") return raw; // error text, e.g. #DIV/0!
  const num = Number(raw);
  if (!Number.isFinite(num)) return raw;
  const styleAttr = attr(open, "s");
  const styleIndex = styleAttr === null ? null : Number(styleAttr);
  if (isDateStyle(styleIndex, ctx)) return excelSerialToIso(num);
  return num;
}

function firstTagText(fragment: string, tag: string): string | null {
  for (const [, inner] of elements(fragment, tag)) return inner;
  return null;
}

/** A cell's value as the import path wants it: a string, with null becoming
 *  an empty field the way an empty CSV cell does. */
function toField(value: CellValue): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value);
}

/** Parse one worksheet part into a dense matrix of string fields. */
export function parseWorksheet(xml: string, ctx: SheetContext): string[][] {
  const matrix: string[][] = [];
  for (const [, rowInner] of elements(xml, "row")) {
    const row: string[] = [];
    for (const [cellOpen, cellInner] of elements(rowInner, "c")) {
      const ref = attr(cellOpen, "r");
      // A cell with no reference simply follows the previous one, which is
      // what a writer that omits `r` means.
      const index = ref ? columnIndexFromRef(ref) : row.length;
      if (index < 0) continue;
      while (row.length < index) row.push("");
      row[index] = toField(cellValue(cellOpen, cellInner, ctx));
    }
    matrix.push(row);
  }
  return matrix;
}

/** Drop leading blank rows, take the first row with content as headers, and
 *  pad every remaining row to that width. Trailing all-empty rows (Excel
 *  loves them) are dropped. */
export function shapeSheet(name: string, matrix: string[][]): XlsxSheet {
  const rows = matrix.filter((r) => r.some((cell) => cell !== ""));
  if (rows.length === 0) return { name, headers: [], rows: [] };
  const rawHeaders = rows[0];
  const width = Math.max(...rows.map((r) => r.length));
  const headers = Array.from({ length: width }, (_, i) => {
    const label = (rawHeaders[i] ?? "").trim();
    // Excel sheets routinely have an unlabelled column; naming it keeps the
    // table creatable rather than failing on an empty identifier.
    return label || `column_${i + 1}`;
  });
  const body = rows.slice(1).map((r) => {
    const padded = r.slice(0, width);
    while (padded.length < width) padded.push("");
    return padded;
  });
  return { name, headers, rows: body };
}

// ── Workbook ─────────────────────────────────────────────────────────────

async function loadZip(bytes: Uint8Array): Promise<JSZipType> {
  const { default: JSZip } = await import("jszip");
  return JSZip.loadAsync(bytes as unknown as ArrayBuffer | Uint8Array);
}

async function partText(zip: JSZipType, path: string): Promise<string | null> {
  const file = zip.file(path);
  return file ? file.async("string") : null;
}

/** Shared strings live in one part and are referenced by index from every
 *  sheet; a workbook of repeated labels stores each once. */
function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const out: string[] = [];
  for (const [, inner] of elements(xml, "si")) out.push(textOf(inner));
  return out;
}

/** `styles.xml` gives each cell format's numFmtId, plus the format codes for
 *  ids above the built-in range. */
function parseStyles(xml: string | null): {
  styleFormats: number[];
  customFormats: Map<number, string>;
} {
  const styleFormats: number[] = [];
  const customFormats = new Map<number, string>();
  if (!xml) return { styleFormats, customFormats };
  for (const [open] of elements(xml, "numFmt")) {
    const id = Number(attr(open, "numFmtId"));
    const code = attr(open, "formatCode");
    if (Number.isFinite(id) && code !== null) customFormats.set(id, code);
  }
  // Only the <cellXfs> block indexes the `s` attribute; <cellStyleXfs> above
  // it is a different table and must not be counted.
  const cellXfs = /<cellXfs[\s>][\s\S]*?<\/cellXfs>/.exec(xml)?.[0] ?? "";
  for (const [open] of elements(cellXfs, "xf")) {
    styleFormats.push(Number(attr(open, "numFmtId") ?? 0));
  }
  return { styleFormats, customFormats };
}

/** Sheet name → part path, in the workbook's own tab order. */
async function sheetParts(
  zip: JSZipType,
): Promise<{ name: string; path: string }[]> {
  const workbook = await partText(zip, "xl/workbook.xml");
  const rels = await partText(zip, "xl/_rels/workbook.xml.rels");
  if (!workbook) return [];
  const targets = new Map<string, string>();
  if (rels) {
    for (const [open] of elements(rels, "Relationship")) {
      const id = attr(open, "Id");
      const target = attr(open, "Target");
      if (id && target) targets.set(id, target.replace(/^\/?xl\//, ""));
    }
  }
  const out: { name: string; path: string }[] = [];
  let fallbackIndex = 0;
  for (const [open] of elements(workbook, "sheet")) {
    fallbackIndex += 1;
    const name = attr(open, "name") ?? `Sheet${fallbackIndex}`;
    const rid = attr(open, "r:id") ?? attr(open, "id");
    const target = rid ? targets.get(rid) : undefined;
    out.push({
      name,
      path: `xl/${target ?? `worksheets/sheet${fallbackIndex}.xml`}`,
    });
  }
  return out;
}

/**
 * Read every worksheet in a workbook. Sheets come back in tab order, each
 * shaped like a CSV import: a header row and string fields, so a sheet can
 * go through the same table-creation path a CSV does.
 */
export async function readXlsxWorkbook(
  input: File | Uint8Array,
): Promise<XlsxSheet[]> {
  const bytes =
    input instanceof Uint8Array
      ? input
      : new Uint8Array(await input.arrayBuffer());
  const zip = await loadZip(bytes);
  const [sharedXml, stylesXml] = await Promise.all([
    partText(zip, "xl/sharedStrings.xml"),
    partText(zip, "xl/styles.xml"),
  ]);
  const ctx: SheetContext = {
    sharedStrings: parseSharedStrings(sharedXml),
    ...parseStyles(stylesXml),
  };
  const parts = await sheetParts(zip);
  if (parts.length === 0) {
    throw new Error("This file has no worksheets; is it really a workbook?");
  }
  const sheets: XlsxSheet[] = [];
  for (const { name, path } of parts) {
    const xml = await partText(zip, path);
    if (xml === null) continue;
    sheets.push(shapeSheet(name, parseWorksheet(xml, ctx)));
  }
  return sheets;
}
