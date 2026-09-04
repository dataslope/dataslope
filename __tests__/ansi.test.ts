/**
 * The terminal renders command output, and just-bash passes escape sequences
 * straight through — `printf` and `echo -e` both emit real ones. Without this
 * parser they would show up in the transcript as escape-code text, which is
 * the one thing a terminal must never do.
 */

import { describe, it, expect } from "vitest";
import { hasAnsi, parseAnsi } from "@/app/_components/git/ansi";

const ESC = "\x1b";
const plain = (text: string) => parseAnsi(text).map((s) => s.text).join("");

describe("parseAnsi", () => {
  it("leaves text without escapes alone, as one span", () => {
    expect(hasAnsi("hello")).toBe(false);
    expect(parseAnsi("hello world")).toEqual([{ text: "hello world", classes: [] }]);
  });

  it("colours a foreground run and resets afterwards", () => {
    const spans = parseAnsi(`${ESC}[31mRED${ESC}[0m plain`);
    expect(spans).toEqual([
      { text: "RED", classes: ["red"] },
      { text: " plain", classes: [] },
    ]);
  });

  it("handles bright colours and backgrounds", () => {
    expect(parseAnsi(`${ESC}[92mok${ESC}[0m`)[0].classes).toEqual(["bright-green"]);
    expect(parseAnsi(`${ESC}[41mbad${ESC}[0m`)[0].classes).toEqual(["bg-red"]);
  });

  it("combines attributes with colour", () => {
    const [span] = parseAnsi(`${ESC}[1;4;33mwarn${ESC}[0m`);
    expect(span.classes).toEqual(["yellow", "bold", "underline"]);
  });

  it("treats a bare escape as a reset, the way terminals do", () => {
    const spans = parseAnsi(`${ESC}[31mred${ESC}[mplain`);
    expect(spans[1]).toEqual({ text: "plain", classes: [] });
  });

  it("turns colour off with 39 without dropping other attributes", () => {
    const spans = parseAnsi(`${ESC}[1;31mboth${ESC}[39mbold-only`);
    expect(spans[0].classes).toEqual(["red", "bold"]);
    expect(spans[1].classes).toEqual(["bold"]);
  });

  it("swallows 256-colour and truecolour arguments instead of misreading them", () => {
    // Without consuming the arguments, the `1` in `5;1` would read as bold.
    expect(parseAnsi(`${ESC}[38;5;1mx`)[0].classes).toEqual([]);
    expect(parseAnsi(`${ESC}[38;2;255;0;0mx`)[0].classes).toEqual([]);
    expect(plain(`${ESC}[38;5;1mx`)).toBe("x");
  });

  it("drops non-SGR sequences rather than printing them", () => {
    // A cursor-movement code must not leak into the transcript as text.
    expect(plain(`a${ESC}[2Kb${ESC}[1;1Hc`)).toBe("abc");
  });

  it("never leaks escape characters into the rendered text", () => {
    const messy = `${ESC}[32mgreen${ESC}[0m ${ESC}[1mbold${ESC}[22m ${ESC}[7Xodd`;
    expect(plain(messy)).not.toContain(ESC);
    expect(plain(messy)).toBe("green bold odd");
  });

  it("merges adjacent runs that share styling", () => {
    // Two resets in a row should not produce three plain spans.
    expect(parseAnsi(`a${ESC}[0mb${ESC}[0mc`)).toEqual([{ text: "abc", classes: [] }]);
  });

  it("handles output that starts mid-colour and never resets", () => {
    expect(parseAnsi(`${ESC}[36mtail`)).toEqual([{ text: "tail", classes: ["cyan"] }]);
  });
});
