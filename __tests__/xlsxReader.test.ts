/**
 * Reading an Excel workbook. The playgrounds could already write .xlsx but
 * had no way to read one, so this reader is what lets a dropped workbook
 * become a table.
 *
 * Two kinds of coverage: a round trip through wasm-xlsxwriter, the writer the
 * app itself exports with, so the reader is proved against a real workbook
 * from an independent producer; and hand-built parts for the shapes a writer
 * of our own would never produce but Excel does — sparse rows, inline
 * strings, date serials, blank leading rows.
 */
import { describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import {
  columnIndexFromRef,
  decodeXmlEntities,
  excelSerialToIso,
  isDateFormat,
  parseWorksheet,
  readXlsxWorkbook,
  shapeSheet,
} from "../app/_components/sql/utils/xlsxReader";

const require = createRequire(import.meta.url);

/** The reader's style context, which the worksheet parser needs. */
function ctx(over: Partial<Parameters<typeof parseWorksheet>[1]> = {}) {
  return {
    sharedStrings: [],
    styleFormats: [],
    customFormats: new Map<number, string>(),
    ...over,
  };
}

function sheetXml(rows: string): string {
  return `<?xml version="1.0"?><worksheet><sheetData>${rows}</sheetData></worksheet>`;
}

describe("XML plumbing", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeXmlEntities("a &amp; b &lt;c&gt; &quot;d&quot; &apos;e&apos;")).toBe(
      `a & b <c> "d" 'e'`,
    );
    expect(decodeXmlEntities("&#65;&#x42;&#x1F600;")).toBe("AB😀");
    expect(decodeXmlEntities("plain")).toBe("plain");
    // An unknown entity is left as written rather than silently dropped.
    expect(decodeXmlEntities("&nbsp;")).toBe("&nbsp;");
  });

  it("maps column letters to indices", () => {
    expect(columnIndexFromRef("A1")).toBe(0);
    expect(columnIndexFromRef("B12")).toBe(1);
    expect(columnIndexFromRef("Z9")).toBe(25);
    expect(columnIndexFromRef("AA1")).toBe(26);
    expect(columnIndexFromRef("AB7")).toBe(27);
  });
});

describe("dates", () => {
  it("recognises date format codes and leaves number formats alone", () => {
    expect(isDateFormat("yyyy-mm-dd")).toBe(true);
    expect(isDateFormat("d mmm yyyy")).toBe(true);
    expect(isDateFormat("hh:mm:ss")).toBe(true);
    expect(isDateFormat("0.00")).toBe(false);
    expect(isDateFormat("#,##0")).toBe(false);
    // Colour sections and quoted literals must not be read as tokens.
    expect(isDateFormat("[Red]0.00")).toBe(false);
    expect(isDateFormat('"May"0')).toBe(false);
    expect(isDateFormat('[$-409]dd/mm/yyyy')).toBe(true);
  });

  it("converts serials, including across Excel's phantom leap day", () => {
    // Serial 1 is 1 January 1900, and everything up to the phantom day
    // counts normally.
    expect(excelSerialToIso(1)).toBe("1900-01-01");
    expect(excelSerialToIso(59)).toBe("1900-02-28");
    // 60 is the 29 February 1900 that never happened. Excel shows it, and
    // no real date may take its place: 1 March belongs to serial 61.
    expect(excelSerialToIso(60)).toBe("1900-02-29");
    expect(excelSerialToIso(61)).toBe("1900-03-01");
    // Everything a real spreadsheet actually contains.
    expect(excelSerialToIso(45000)).toBe("2023-03-15");
    expect(excelSerialToIso(45000.5)).toBe("2023-03-15 12:00:00");
    expect(excelSerialToIso(25569)).toBe("1970-01-01");
  });

  it("formats a cell as a date only when its style says so", () => {
    const rows = parseWorksheet(
      sheetXml(
        `<row r="1"><c r="A1" s="0"><v>45000</v></c><c r="B1" s="1"><v>45000</v></c><c r="C1" s="2"><v>45000</v></c></row>`,
      ),
      ctx({
        // style 0 → general, style 1 → built-in date 14, style 2 → custom 165
        styleFormats: [0, 14, 165],
        customFormats: new Map([[165, "yyyy-mm-dd hh:mm"]]),
      }),
    );
    expect(rows[0]).toEqual(["45000", "2023-03-15", "2023-03-15"]);
  });
});

describe("worksheet cells", () => {
  it("resolves shared strings by index", () => {
    const rows = parseWorksheet(
      sheetXml(`<row><c r="A1" t="s"><v>1</v></c><c r="B1" t="s"><v>0</v></c></row>`),
      ctx({ sharedStrings: ["alpha", "beta"] }),
    );
    expect(rows[0]).toEqual(["beta", "alpha"]);
  });

  it("reads inline strings, booleans, errors and cached formula values", () => {
    const rows = parseWorksheet(
      sheetXml(
        `<row>` +
          `<c r="A1" t="inlineStr"><is><t>inline</t></is></c>` +
          `<c r="B1" t="b"><v>1</v></c>` +
          `<c r="C1" t="b"><v>0</v></c>` +
          `<c r="D1" t="e"><v>#DIV/0!</v></c>` +
          `<c r="E1" t="str"><f>CONCAT(A1,"!")</f><v>inline!</v></c>` +
          `</row>`,
      ),
      ctx(),
    );
    expect(rows[0]).toEqual(["inline", "TRUE", "FALSE", "#DIV/0!", "inline!"]);
  });

  it("keeps sparse cells in their own columns", () => {
    // Excel omits empty cells entirely: A, then D.
    const rows = parseWorksheet(
      sheetXml(`<row><c r="A2"><v>1</v></c><c r="D2"><v>4</v></c></row>`),
      ctx(),
    );
    expect(rows[0]).toEqual(["1", "", "", "4"]);
  });

  it("treats a cell with no reference as following the previous one", () => {
    const rows = parseWorksheet(
      sheetXml(`<row><c><v>1</v></c><c><v>2</v></c></row>`),
      ctx(),
    );
    expect(rows[0]).toEqual(["1", "2"]);
  });

  it("reads an empty cell as an empty field, not a missing column", () => {
    const rows = parseWorksheet(
      sheetXml(`<row><c r="A1"/><c r="B1"><v>2</v></c></row>`),
      ctx(),
    );
    expect(rows[0]).toEqual(["", "2"]);
  });

  it("concatenates the runs of a rich shared string", () => {
    const rows = parseWorksheet(
      sheetXml(`<row><c r="A1" t="s"><v>0</v></c></row>`),
      ctx({ sharedStrings: ["boldplain"] }),
    );
    expect(rows[0]).toEqual(["boldplain"]);
  });
});

describe("shaping a sheet into headers and rows", () => {
  it("uses the first row with content as headers", () => {
    const sheet = shapeSheet("Sheet1", [
      [],
      ["", ""],
      ["id", "name"],
      ["1", "Ada"],
    ]);
    expect(sheet.headers).toEqual(["id", "name"]);
    expect(sheet.rows).toEqual([["1", "Ada"]]);
  });

  it("names unlabelled columns so the table can be created", () => {
    const sheet = shapeSheet("Sheet1", [["id", "", "city"], ["1", "x", "Davis"]]);
    expect(sheet.headers).toEqual(["id", "column_2", "city"]);
  });

  it("pads short rows to the widest row", () => {
    const sheet = shapeSheet("Sheet1", [["a", "b", "c"], ["1"], ["1", "2"]]);
    expect(sheet.rows).toEqual([
      ["1", "", ""],
      ["1", "2", ""],
    ]);
  });

  it("drops rows that are entirely empty", () => {
    const sheet = shapeSheet("Sheet1", [["a"], [""], ["1"], ["", ""]]);
    expect(sheet.rows).toEqual([["1"]]);
  });

  it("reports an empty sheet as empty rather than inventing a header", () => {
    expect(shapeSheet("Blank", [[], ["", ""]])).toEqual({
      name: "Blank",
      headers: [],
      rows: [],
    });
  });
});

// ── Round trip against the app's own writer ──────────────────────────────

interface XlsxWriter {
  Workbook: new () => {
    addWorksheet: () => Worksheet;
    saveToBufferSync: () => Uint8Array;
  };
  Format: new () => { setNumFormat: (code: string) => unknown };
}

interface Worksheet {
  setName: (name: string) => unknown;
  writeString: (row: number, col: number, value: string) => unknown;
  writeNumber: (row: number, col: number, value: number) => unknown;
  writeBoolean: (row: number, col: number, value: boolean) => unknown;
  writeNumberWithFormat: (
    row: number,
    col: number,
    value: number,
    format: unknown,
  ) => unknown;
}

describe("a workbook written by wasm-xlsxwriter", () => {
  function buildWorkbook(): Uint8Array {
    const xlsx = require("wasm-xlsxwriter/nodejs") as XlsxWriter;
    const workbook = new xlsx.Workbook();

    const sales = workbook.addWorksheet();
    sales.setName("Sales");
    const headers = ["product", "qty", "price", "in_stock", "sold_on"];
    headers.forEach((h, i) => sales.writeString(0, i, h));
    const dateFormat = new xlsx.Format();
    dateFormat.setNumFormat("yyyy-mm-dd");
    sales.writeString(1, 0, "Widget & Co <2>");
    sales.writeNumber(1, 1, 3);
    sales.writeNumber(1, 2, 9.99);
    sales.writeBoolean(1, 3, true);
    // 45000 is 2023-03-15 as an Excel serial.
    sales.writeNumberWithFormat(1, 4, 45000, dateFormat);
    sales.writeString(2, 0, "Gadget");
    sales.writeNumber(2, 1, 12);
    sales.writeNumber(2, 2, 1.5);
    sales.writeBoolean(2, 3, false);
    sales.writeNumberWithFormat(2, 4, 45001, dateFormat);

    const regions = workbook.addWorksheet();
    regions.setName("Regions");
    regions.writeString(0, 0, "region");
    regions.writeString(1, 0, "West");

    return workbook.saveToBufferSync();
  }

  it("reads back every sheet, in tab order, with its values", async () => {
    const sheets = await readXlsxWorkbook(new Uint8Array(buildWorkbook()));
    expect(sheets.map((s) => s.name)).toEqual(["Sales", "Regions"]);

    const sales = sheets[0];
    expect(sales.headers).toEqual([
      "product",
      "qty",
      "price",
      "in_stock",
      "sold_on",
    ]);
    expect(sales.rows).toEqual([
      ["Widget & Co <2>", "3", "9.99", "TRUE", "2023-03-15"],
      ["Gadget", "12", "1.5", "FALSE", "2023-03-16"],
    ]);

    expect(sheets[1]).toEqual({
      name: "Regions",
      headers: ["region"],
      rows: [["West"]],
    });
  });

  it("rejects a file that is a zip but not a workbook", async () => {
    const { default: JSZip } = await import("jszip");
    const zip = new JSZip();
    zip.file("hello.txt", "not a workbook");
    const bytes = await zip.generateAsync({ type: "uint8array" });
    await expect(readXlsxWorkbook(bytes)).rejects.toThrow(/worksheets/i);
  });
});
