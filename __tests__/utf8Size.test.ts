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
      // A lone surrogate: encoders emit U+FFFD, 3 bytes.
      "\uD83D",
    ];
    for (const s of samples) {
      expect(utf8ByteLength(s)).toBe(new TextEncoder().encode(s).length);
    }
  });
});
