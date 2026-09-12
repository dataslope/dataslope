/**
 * Feedback while a database file is being imported in a SQL playground.
 * A 100 MB `.db` file used to drop into an idle-looking dialog: the read and
 * the engine restore both ran with nothing on screen, so the import read as
 * "nothing happened". These pin the two halves of the fix — the phase model
 * the dialogs render, and the file read that feeds it.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  DEFAULT_IMPORT_STEP,
  formatFileSize,
  importProgressLabel,
  importProgressPercent,
  importProgressSizeText,
  readFileAsBytes,
  readFileAsText,
  type ImportProgress,
} from "../app/_components/sql/utils/importProgress";
import { ImportProgressPanel } from "../app/_components/sql/components/ImportProgressPanel";

const MB = 1024 * 1024;

function reading(fields: Partial<ImportProgress> = {}): ImportProgress {
  return {
    filename: "chinook.db",
    stage: "reading",
    totalBytes: 100 * MB,
    loadedBytes: 25 * MB,
    step: "",
    startedAt: Date.now(),
    ...fields,
  };
}

function working(fields: Partial<ImportProgress> = {}): ImportProgress {
  return reading({
    stage: "working",
    loadedBytes: 100 * MB,
    step: "Restoring database",
    ...fields,
  });
}

describe("formatFileSize", () => {
  it("scales to the unit that keeps the number short", () => {
    expect(formatFileSize(0)).toBe("0 B");
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(2048)).toBe("2.0 KB");
    expect(formatFileSize(100 * MB)).toBe("100 MB");
    expect(formatFileSize(1.5 * 1024 * MB)).toBe("1.5 GB");
  });

  it("never reports a negative or non-finite size", () => {
    expect(formatFileSize(-1)).toBe("0 B");
    expect(formatFileSize(Number.NaN)).toBe("0 B");
  });
});

describe("importProgressPercent", () => {
  it("measures the file read", () => {
    expect(importProgressPercent(reading())).toBe(25);
    expect(importProgressPercent(reading({ loadedBytes: 100 * MB }))).toBe(100);
  });

  it("clamps a total the browser under-reported", () => {
    expect(
      importProgressPercent(reading({ loadedBytes: 200 * MB })),
    ).toBe(100);
  });

  it("is indeterminate before the first chunk, and with no total", () => {
    expect(importProgressPercent(reading({ loadedBytes: 0 }))).toBeNull();
    expect(importProgressPercent(reading({ totalBytes: 0 }))).toBeNull();
  });

  it("is indeterminate for engine work, which reports steps not bytes", () => {
    expect(importProgressPercent(working())).toBeNull();
  });
});

describe("import progress text", () => {
  it("names the read, then whatever step the engine reported", () => {
    expect(importProgressLabel(reading())).toBe("Reading file");
    expect(importProgressLabel(working())).toBe("Restoring database");
    expect(importProgressLabel(working({ step: "" }))).toBe(
      DEFAULT_IMPORT_STEP,
    );
  });

  it("counts bytes while reading and shows the whole size afterwards", () => {
    expect(importProgressSizeText(reading())).toBe("25 MB of 100 MB");
    expect(importProgressSizeText(working())).toBe("100 MB");
    expect(importProgressSizeText(reading({ totalBytes: 0 }))).toBe("");
  });
});

describe("ImportProgressPanel", () => {
  it("renders a determinate bar for the read", () => {
    const html = renderToStaticMarkup(
      <ImportProgressPanel progress={reading()} />,
    );
    expect(html).toContain("Reading file");
    expect(html).toContain('aria-valuenow="25"');
    expect(html).toContain("25%");
    expect(html).toContain("width:25%");
    expect(html).not.toContain("indeterminate");
    expect(html).toContain("chinook.db");
    expect(html).toContain("25 MB of 100 MB");
  });

  it("renders an indeterminate bar with no value for engine work", () => {
    const html = renderToStaticMarkup(
      <ImportProgressPanel progress={working()} />,
    );
    expect(html).toContain("Restoring database");
    expect(html).toContain("indeterminate");
    expect(html).not.toContain("aria-valuenow");
  });

  it("warns that a large file takes a while, and does not for a small one", () => {
    const big = renderToStaticMarkup(
      <ImportProgressPanel progress={working()} />,
    );
    expect(big).toContain("can take a while");
    const small = renderToStaticMarkup(
      <ImportProgressPanel
        progress={working({ totalBytes: 4096, loadedBytes: 4096 })}
      />,
    );
    expect(small).not.toContain("can take a while");
  });
});

// ── The file read behind the "reading" phase ─────────────────────────────
// Node has no FileReader, so the events are driven by hand: what matters is
// which handler each one reaches, not the platform's own plumbing.

interface FakeReaderState {
  reader: FakeFileReader;
  method: "text" | "bytes";
}

const readers: FakeReaderState[] = [];

class FakeFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onprogress: ((ev: { loaded: number; total: number }) => void) | null = null;
  result: string | ArrayBuffer | null = null;
  error: { message: string } | null = null;
  aborted = false;

  readAsText() {
    readers.push({ reader: this, method: "text" });
  }
  readAsArrayBuffer() {
    readers.push({ reader: this, method: "bytes" });
  }
  abort() {
    this.aborted = true;
  }
}

function installFakeReader() {
  readers.length = 0;
  vi.stubGlobal("FileReader", FakeFileReader);
  return () => readers[readers.length - 1].reader;
}

function fakeFile(name: string, size: number): File {
  return { name, size } as File;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readFileAsBytes / readFileAsText", () => {
  it("forwards progress, falling back to the file's own size for the total", () => {
    const last = installFakeReader();
    const onProgress = vi.fn();
    readFileAsBytes(fakeFile("big.db", 100), {
      onProgress,
      onDone: vi.fn(),
      onError: vi.fn(),
    });
    const reader = last();
    reader.onprogress?.({ loaded: 40, total: 100 });
    // A source with no computable length reports total 0.
    reader.onprogress?.({ loaded: 60, total: 0 });
    expect(onProgress.mock.calls).toEqual([
      [40, 100],
      [60, 100],
    ]);
  });

  it("hands back bytes, and tops the bar up to 100% first", () => {
    const last = installFakeReader();
    const onProgress = vi.fn();
    const onDone = vi.fn();
    readFileAsBytes(fakeFile("big.db", 4), {
      onProgress,
      onDone,
      onError: vi.fn(),
    });
    const reader = last();
    reader.onprogress?.({ loaded: 3, total: 4 });
    reader.result = new Uint8Array([1, 2, 3, 4]).buffer;
    reader.onload?.();
    expect(onProgress).toHaveBeenLastCalledWith(4, 4);
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(Array.from(onDone.mock.calls[0][0] as Uint8Array)).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("hands back text for a dump", () => {
    const last = installFakeReader();
    const onDone = vi.fn();
    readFileAsText(fakeFile("dump.sql", 10), {
      onDone,
      onError: vi.fn(),
    });
    const reader = last();
    reader.result = "CREATE TABLE t (id INTEGER);";
    reader.onload?.();
    expect(onDone).toHaveBeenCalledWith("CREATE TABLE t (id INTEGER);");
  });

  it("reports a read failure instead of swallowing it", () => {
    const last = installFakeReader();
    const onError = vi.fn();
    readFileAsBytes(fakeFile("gone.db", 10), {
      onDone: vi.fn(),
      onError,
    });
    const reader = last();
    reader.error = { message: "NotReadableError" };
    reader.onerror?.();
    expect(onError).toHaveBeenCalledWith("NotReadableError");
  });

  it("reports a result of the wrong type as a failed read", () => {
    const last = installFakeReader();
    const onError = vi.fn();
    const onDone = vi.fn();
    readFileAsBytes(fakeFile("odd.db", 10), { onDone, onError });
    const reader = last();
    reader.result = "not bytes";
    reader.onload?.();
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith("The file could not be read.");
  });

  it("stops on abort: the reader is cancelled and no handler fires after", () => {
    const last = installFakeReader();
    const onDone = vi.fn();
    const onError = vi.fn();
    const onProgress = vi.fn();
    const handle = readFileAsBytes(fakeFile("big.db", 10), {
      onProgress,
      onDone,
      onError,
    });
    const reader = last();
    handle.abort();
    expect(reader.aborted).toBe(true);
    // A late event from a reader that had already queued one changes nothing.
    reader.onprogress?.({ loaded: 5, total: 10 });
    reader.result = new ArrayBuffer(10);
    reader.onload?.();
    reader.onerror?.();
    expect(onProgress).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it("delivers each result once, however many events arrive", () => {
    const last = installFakeReader();
    const onDone = vi.fn();
    readFileAsText(fakeFile("dump.sql", 3), { onDone, onError: vi.fn() });
    const reader = last();
    reader.result = "sql";
    reader.onload?.();
    reader.onload?.();
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
