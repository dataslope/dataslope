/**
 * The Files panel labels its size column "B", so `utf8ByteLength` has to
 * agree with what `os.path.getsize()` reports inside a runtime — which
 * `String.length` does not for anything outside ASCII.
 */
import { describe, expect, it } from "vitest";

import { utf8ByteLength } from "../app/_components/utf8Size";

describe("utf8ByteLength", () => {
  it("matches TextEncoder across scripts and emoji", () => {
    const samples = [
      "",
      "plain ascii",
      "café",
      "你好",
      "😀",
      "em — dash",
      "# main.py — café 你好 \u{1F600}\nprint('hi')\n",
      "mixed ascii/é/你/😀 in one line",
    ];
    for (const s of samples) {
      expect(utf8ByteLength(s)).toBe(new TextEncoder().encode(s).length);
    }
  });

  it("counts the characters the audit measured", () => {
    // "—" is 3 bytes (+2 over its 1 UTF-16 unit), "é" 2 (+1), "你" and "好"
    // 3 each (+2 each): 7 bytes more than String.length, which is exactly
    // the gap the panel used to under-report.
    const s = "—é你好";
    expect(s.length).toBe(4);
    expect(utf8ByteLength(s)).toBe(11);
  });

  it("counts a surrogate pair once, as four bytes", () => {
    expect("😀".length).toBe(2);
    expect(utf8ByteLength("😀")).toBe(4);
  });

  it("handles a lone surrogate the way an encoder does", () => {
    const lone = "\uD83D";
    expect(utf8ByteLength(lone)).toBe(
      new TextEncoder().encode(lone).length,
    );
  });
});
