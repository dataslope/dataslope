/**
 * The file read behind a SQL playground's database import. What must hold is
 * that a failure is reported and that a cancelled import stays cancelled: a
 * read that finished after the learner pressed Cancel must not go on to
 * restore the file over their database.
 *
 * Node has no FileReader, so the events are driven by hand: what matters is
 * which handler each one reaches, not the platform's own plumbing.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileAsBytes } from "../app/_components/sql/utils/importProgress";

const readers: FakeFileReader[] = [];

class FakeFileReader {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onprogress: ((ev: { loaded: number; total: number }) => void) | null = null;
  result: string | ArrayBuffer | null = null;
  error: { message: string } | null = null;
  aborted = false;

  readAsArrayBuffer() {
    readers.push(this);
  }
  abort() {
    this.aborted = true;
  }
}

function installFakeReader() {
  readers.length = 0;
  vi.stubGlobal("FileReader", FakeFileReader);
  return () => readers[readers.length - 1];
}

function fakeFile(name: string, size: number): File {
  return { name, size } as File;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readFileAsBytes", () => {
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
});
