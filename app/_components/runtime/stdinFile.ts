/**
 * The workspace file a program's standard input is read from.
 *
 * There is no console to type into, so "supply stdin" has to mean
 * something a file browser can express. C and C++ established it; Java
 * follows, so `Scanner` and `scanf` are fed the same way and the answer to
 * "how do I give this program input?" is one answer, not three.
 */
export const STDIN_FILENAME = "stdin.txt";

/**
 * The bytes a STDIN panel's text becomes on the way to the program.
 *
 * One rule: what the panel shows as N lines is fed as N lines, each one
 * terminated. The panel is a line-numbered editor, so its last line has to
 * be a *line* — a `fgets` loop that silently drops the final entry because
 * the author didn't think to end the prop with `\n` is the kind of bug that
 * gets blamed on the lesson's code. Terminating here also means the authored
 * text needs no trailing newline of its own, which is what kept an empty
 * line 2 sitting under a one-line input like `30`.
 *
 * Empty input stays empty: zero lines is zero lines, and handing a program
 * a lone newline is not the same as handing it nothing (`getchar()` returns
 * one and then EOF, rather than EOF straight away).
 *
 * Both sides of the wire call this. `<CodeBlock>` stages the result, and the
 * headless generators feed the same bytes to fd 0, so a recorded panel and a
 * live Run cannot disagree about where the input ended.
 */
export function normalizeStdin(text: string): string {
  if (text === "") return "";
  return text.endsWith("\n") ? text : `${text}\n`;
}
