import { describe, expect, it } from "vitest";
import { isDuckDbReadableFile } from "../app/_components/sql/utils/importUtils";

describe("isDuckDbReadableFile", () => {
  it("reads the real format through case, folders and one compression suffix", () => {
    expect(isDuckDbReadableFile("DATA.CSV")).toBe(true);
    expect(isDuckDbReadableFile("data.csv.gz")).toBe(true);
    // A dot in a parent folder must not be mistaken for the file extension.
    expect(isDuckDbReadableFile("v1.0/notes")).toBe(false);
    // A bare compression suffix hides the format; tar is not readable.
    expect(isDuckDbReadableFile("archive.gz")).toBe(false);
    expect(isDuckDbReadableFile("dump.tar.gz")).toBe(false);
  });
});
