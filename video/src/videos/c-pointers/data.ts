// Everything the video prints, from real runs. Pure (no Remotion, no DOM).
//
// Each figure's listing was compiled exactly as it appears on screen with gcc
// 13.3.0 (`gcc -std=c11 -Wall -Wextra`, no warnings) on x86_64 Linux, and its
// stdout is what the figure shows. To draw the boxes, the same code was run
// once more with lines that print the addresses to stderr, so stdout stayed
// identical; the addresses below are from that one run of each figure.
//
// Addresses differ on every run (address space layout randomization is on:
// /proc/sys/kernel/randomize_va_space is 2), which is why each figure says
// they come from one run, and why x sits at a different address in Fig. 2
// and Fig. 3: they are two runs.

export const VIDEO = "c-pointers";

/**
 * Whether public/images/c-pointers/ holds the two watercolors from
 * illustrations.json. Every frame is laid out with room for them either way;
 * set this to true once `npm run illustrations -- c-pointers` has written
 * both WebPs.
 */
export const ILLUSTRATIONS = false;

/** `sizeof(int)` and `sizeof(int *)`, printed by the Fig. 1 run. */
export const SIZEOF_INT = 4;
export const SIZEOF_PTR = 8;

/** Fig. 1: the lesson's opening lines, then `*p = 100`. */
export const FIG1 = {
  lines: ["int n = 42;", "int *p = &n;", 'printf("%d\\n", *p);', "*p = 100;", 'printf("%d\\n", n);'],
  /** Index-aligned with `lines`: what each line printed. */
  prints: [null, null, "42", null, "100"],
  /** &n, and p's value, which printed the same. */
  n: "0x7ffc6204c7ac",
  /** &p: the next byte after n's four. */
  p: "0x7ffc6204c7b0",
} as const;

/** The function body and main shared by Figs. 2 and 3, by line. */
const listing = (params: string, body: readonly [string, string, string], call: string) =>
  [
    `void swap(${params}) {`,
    `  ${body[0]}`,
    `  ${body[1]}`,
    `  ${body[2]}`,
    "}",
    "",
    "int main(void) {",
    "  int x = 1, y = 2;",
    `  ${call}`,
    '  printf("x = %d, y = %d\\n", x, y);',
    "}",
  ] as const;

/** Fig. 2: the swap that takes ints, so it gets copies. */
export const FIG2 = {
  lines: listing("int a, int b", ["int tmp = a;", "a = b;", "b = tmp;"], "swap(x, y);"),
  x: "0x7ffc724ef9c0",
  y: "0x7ffc724ef9c4",
  /** The copies: inside swap they ended up holding 2 and 1. */
  a: "0x7ffc724ef99c",
  b: "0x7ffc724ef998",
  stdout: "x = 1, y = 2",
} as const;

/** Fig. 3: the lesson's swap, through pointers. */
export const FIG3 = {
  lines: listing("int *a, int *b", ["int tmp = *a;", "*a = *b;", "*b = tmp;"], "swap(&x, &y);"),
  x: "0x7fff6ac55350",
  y: "0x7fff6ac55354",
  a: "0x7fff6ac55328",
  b: "0x7fff6ac55320",
  /** The values of a and b inside swap: &x and &y, as printed. */
  aHolds: "0x7fff6ac55350",
  bHolds: "0x7fff6ac55354",
  stdout: "x = 2, y = 1",
} as const;

// `node src/videos/c-pointers/data.ts` checks the recorded runs hang together.
const runAsScript =
  typeof process !== "undefined" && typeof process.argv?.[1] === "string" && process.argv[1].endsWith("data.ts");
if (runAsScript) {
  const hex = (s: string) => BigInt(s);
  const check = (ok: boolean, what: string) => console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  const same = (a: string, b: string) => a === b;
  check(hex(FIG1.p) - hex(FIG1.n) === BigInt(SIZEOF_INT), "Fig. 1: p starts right after n's four bytes");
  check(hex(FIG2.y) - hex(FIG2.x) === BigInt(SIZEOF_INT), "Fig. 2: y follows x");
  check(!same(FIG2.a, FIG2.x) && !same(FIG2.b, FIG2.y), "Fig. 2: the copies live at other addresses");
  check(same(FIG3.aHolds, FIG3.x) && same(FIG3.bHolds, FIG3.y), "Fig. 3: a holds &x and b holds &y");
  check(hex(FIG3.a) - hex(FIG3.b) === BigInt(SIZEOF_PTR), "Fig. 3: a and b are eight bytes apart");
}
