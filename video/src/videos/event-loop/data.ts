/**
 * The lesson's snippet, character for character
 * (content/courses/beginners-javascript/how-javascript-runs.mdx, "A famous
 * ordering puzzle"), and what Node 22 prints when it runs it.
 */
export const CODE = [
  'console.log("1: script start");',
  "",
  "setTimeout(() => {",
  '  console.log("4: setTimeout callback");',
  "}, 0);",
  "",
  "Promise.resolve().then(() => {",
  '  console.log("3: promise microtask");',
  "});",
  "",
  'console.log("2: script end");',
] as const;

/** `node main.js`, verbatim. */
export const OUTPUT = [
  "1: script start",
  "2: script end",
  "3: promise microtask",
  "4: setTimeout callback",
] as const;

/** Where each log's label number sits in CODE: [line, column], 0-based. */
export const LABEL_DIGIT: Record<1 | 2 | 3 | 4, [number, number]> = {
  1: [0, 13],
  2: [10, 13],
  3: [7, 15],
  4: [3, 15],
};

/** Columns a line's string literal spans, quotes included: [first, end). */
export const stringSpan = (line: number): [number, number] => {
  const text = CODE[line];
  return [text.indexOf('"'), text.lastIndexOf('"') + 1];
};

/** The `0` delay in `}, 0);`. */
export const DELAY_DIGIT: [number, number] = [4, 3];

export const LESSON_URL = "dataslope.com/courses/beginners-javascript/how-javascript-runs";
export const LESSON_TITLE = "How JavaScript Runs";
export const COURSE_TITLE = "Beginner's Guide to JavaScript";
