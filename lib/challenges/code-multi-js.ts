/**
 * Multi-step JavaScript challenges.
 *
 * Same shape as the Python set: each step adds one function to a program that
 * keeps growing, and a step's starter is the previous step's accepted solution
 * plus a stub. Those accepted programs are shared constants, so a fix to an
 * early step cannot leave a later one quoting code that no longer exists.
 *
 * `__tests__/challengeSolutions` runs every step's solution under `node` with
 * the real harness, so a step whose reference answer does not pass its own
 * checks fails CI.
 */

import { codeSteps } from "./authoring";
import type { Challenge } from "./types";

// ─── Matrix Rotation ─────────────────────────────────────────────────

const TRANSPOSE = `function transpose(matrix) {
  if (matrix.length === 0) return [];
  return matrix[0].map((_, col) => matrix.map((row) => row[col]));
}
`;

const ROTATE = `${TRANSPOSE}
function rotate(matrix) {
  return transpose(matrix).map((row) => row.reverse());
}
`;

const MATRIX_ROTATION = codeSteps(
  {
    slug: "matrix-rotation",
    title: "Matrix Rotation",
    difficulty: "Intermediate",
    topic: "Arrays",
    language: "javascript",
    description:
      "Rotate a grid a quarter turn at a time: transpose it, turn that into a rotation, then apply any number of turns.",
    solutionNote: [
      "A quarter turn clockwise is a transpose followed by reversing each row: two operations you can each check on paper, rather than one index expression you have to trust. Reducing ",
      { code: "k" },
      " modulo 4 before looping is what keeps ",
      { code: "rotateTimes(grid, 1000000)" },
      " instant.",
    ],
  },
  [
    {
      title: "Transpose the grid",
      short: "Transpose",
      solutionNote: [
        "Building the output from the input's first row is what makes this work on rectangles: the number of output rows is the number of input ",
        { code: "columns" },
        ", not rows. Returning new arrays rather than writing into the original is what lets step 2 compose this safely.",
      ],
      signature: "function transpose(matrix: number[][]): number[][]",
      prompt: [
        [
          "Flip a grid across its diagonal: the value at row ",
          { code: "r" },
          ", column ",
          { code: "c" },
          " ends up at row ",
          { code: "c" },
          ", column ",
          { code: "r" },
          ".",
        ],
        "Return a new grid rather than changing the one you were given. The grid can be rectangular, so a 2×3 transposes into a 3×2, and an empty grid transposes into an empty grid.",
      ],
      starter: `function transpose(matrix) {
  if (matrix.length === 0) return [];
  // One output row per input column.
  return [];
}
`,
      solution: TRANSPOSE,
      tests: [
        {
          id: "square",
          name: "A square grid",
          code: `const got = transpose([[1, 2], [3, 4]]);
if (JSON.stringify(got) !== JSON.stringify([[1, 3], [2, 4]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "rectangular",
          name: "A 2 by 3 becomes a 3 by 2",
          code: `const got = transpose([[1, 2, 3], [4, 5, 6]]);
if (JSON.stringify(got) !== JSON.stringify([[1, 4], [2, 5], [3, 6]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "single",
          name: "A one-cell grid",
          code: `const got = transpose([[1]]);
if (JSON.stringify(got) !== JSON.stringify([[1]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "An empty grid",
          code: `if (JSON.stringify(transpose([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "no-mutation",
          name: "The original grid is left alone",
          code: `const grid = [[1, 2], [3, 4]];
transpose(grid);
if (JSON.stringify(grid) !== JSON.stringify([[1, 2], [3, 4]])) {
  throw new Error("the input changed: " + JSON.stringify(grid));
}`,
        },
      ],
    },
    {
      title: "Turn it a quarter clockwise",
      short: "Rotate",
      solutionNote: [
        "A quarter turn clockwise is a transpose followed by reversing each row: two operations you can each check on paper, rather than one index expression you have to trust. The ",
        { code: "reverse()" },
        " is safe here only because ",
        { code: "transpose" },
        " already returned fresh arrays; calling it on the caller's rows would corrupt them.",
      ],
      signature: "function rotate(matrix: number[][]): number[][]",
      prompt: [
        [
          "Add ",
          { code: "rotate" },
          ", a single quarter turn clockwise. Build it out of step 1: transpose, then reverse each row.",
        ],
        [
          "Check it on ",
          { code: "[[1, 2], [3, 4]]" },
          ": the top-left 1 should end up top-right, giving ",
          { code: "[[3, 1], [4, 2]]" },
          ".",
        ],
      ],
      starter: `${TRANSPOSE}
function rotate(matrix) {
  // Transpose, then reverse each row.
  return transpose(matrix);
}
`,
      solution: ROTATE,
      tests: [
        {
          id: "square",
          name: "A square grid turns clockwise",
          code: `const got = rotate([[1, 2], [3, 4]]);
if (JSON.stringify(got) !== JSON.stringify([[3, 1], [4, 2]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "rectangular",
          name: "A 2 by 3 turns into a 3 by 2",
          code: `const got = rotate([[1, 2, 3], [4, 5, 6]]);
if (JSON.stringify(got) !== JSON.stringify([[4, 1], [5, 2], [6, 3]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "four-turns",
          name: "Four turns come back to the start",
          code: `const grid = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
const got = rotate(rotate(rotate(rotate(grid))));
if (JSON.stringify(got) !== JSON.stringify(grid)) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "An empty grid",
          code: `if (JSON.stringify(rotate([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "transpose-survives",
          name: "Transpose still works",
          code: `const got = transpose([[1, 2], [3, 4]]);
if (JSON.stringify(got) !== JSON.stringify([[1, 3], [2, 4]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
      ],
    },
    {
      title: "Any number of turns",
      short: "Turns",
      solutionNote: [
        "Reducing ",
        { code: "k" },
        " modulo 4 before looping is what makes a million turns instant. The ",
        { code: "((k % 4) + 4) % 4" },
        " dance is JavaScript-specific: its ",
        { code: "%" },
        " keeps the sign of the left operand, so ",
        { code: "-1 % 4" },
        " is ",
        { code: "-1" },
        " rather than the 3 you want.",
      ],
      signature:
        "function rotateTimes(matrix: number[][], k: number): number[][]",
      prompt: [
        [
          "Add ",
          { code: "rotateTimes" },
          ", which applies ",
          { code: "k" },
          " quarter turns clockwise. Four turns is the identity, so reduce ",
          { code: "k" },
          " modulo 4 before doing any work: a million turns should be as fast as one.",
        ],
        [
          { code: "k" },
          " can be zero, in which case return a copy of the grid unchanged, and it can be negative, meaning turns anticlockwise: ",
          { code: "-1" },
          " is the same as ",
          { code: "3" },
          ".",
        ],
      ],
      starter: `${ROTATE}
function rotateTimes(matrix, k) {
  let out = matrix.map((row) => [...row]);
  // Four turns is the identity, so only 0-3 of them do anything.
  return out;
}
`,
      solution: `${ROTATE}
function rotateTimes(matrix, k) {
  let out = matrix.map((row) => [...row]);
  const turns = ((k % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) out = rotate(out);
  return out;
}
`,
      tests: [
        {
          id: "one",
          name: "One turn matches rotate",
          code: `const got = rotateTimes([[1, 2], [3, 4]], 1);
if (JSON.stringify(got) !== JSON.stringify([[3, 1], [4, 2]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "two",
          name: "Two turns flip the grid",
          code: `const got = rotateTimes([[1, 2], [3, 4]], 2);
if (JSON.stringify(got) !== JSON.stringify([[4, 3], [2, 1]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "zero-and-four",
          name: "Zero and four turns change nothing",
          code: `const grid = [[1, 2], [3, 4]];
for (const k of [0, 4, 8]) {
  const got = rotateTimes(grid, k);
  if (JSON.stringify(got) !== JSON.stringify(grid)) {
    throw new Error("k=" + k + " gave " + JSON.stringify(got));
  }
}`,
        },
        {
          id: "negative",
          name: "A negative k turns anticlockwise",
          code: `const grid = [[1, 2], [3, 4]];
const back = JSON.stringify(rotateTimes(grid, -1));
const forward = JSON.stringify(rotateTimes(grid, 3));
if (back !== forward) throw new Error("-1 gave " + back + ", 3 gave " + forward);`,
        },
        {
          id: "huge",
          name: "A million turns is instant",
          description: "Reduce k modulo 4 rather than looping a million times.",
          code: `const got = rotateTimes([[1, 2], [3, 4]], 1000002);
if (JSON.stringify(got) !== JSON.stringify([[4, 3], [2, 1]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "no-mutation",
          name: "The original grid is left alone",
          code: `const grid = [[1, 2], [3, 4]];
rotateTimes(grid, 3);
if (JSON.stringify(grid) !== JSON.stringify([[1, 2], [3, 4]])) {
  throw new Error("the input changed: " + JSON.stringify(grid));
}`,
        },
      ],
    },
  ],
);

// ─── Nested Lookup ───────────────────────────────────────────────────

const GET_PATH = `function getPath(object, path) {
  let current = object;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}
`;

const GET_PATH_FALLBACK = `function getPath(object, path, fallback) {
  let current = object;
  for (const key of path.split(".")) {
    if (current === null || typeof current !== "object") return fallback;
    current = current[key];
  }
  return current === undefined ? fallback : current;
}
`;

const NESTED_LOOKUP = codeSteps(
  {
    slug: "nested-lookup",
    title: "Nested Lookup",
    difficulty: "Intermediate",
    topic: "Traversal",
    language: "javascript",
    description:
      "Read and write deep inside a nested object by dotted path, without a crash when part of the path is missing.",
    solutionNote: [
      "Walking the path with a cursor is what keeps this a loop rather than a pile of ",
      { code: "&&" },
      ' guards. The subtle part is telling "missing" apart from "stored as null": bailing out when the cursor stops being an object handles the first, and checking for ',
      { code: "undefined" },
      " at the end handles the second, so a stored ",
      { code: "null" },
      " comes back as ",
      { code: "null" },
      " and not as the fallback.",
    ],
  },
  [
    {
      title: "Read by path",
      short: "Read",
      solutionNote: [
        "Walking the path with a cursor is what keeps this a loop rather than a pile of ",
        { code: "&&" },
        " guards. Bailing out when the cursor stops being an object is what stops a path running into a number from throwing, and it costs one check per level.",
      ],
      signature: "function getPath(object: unknown, path: string): unknown",
      prompt: [
        [
          "Given a nested object and a dotted path like ",
          { code: '"user.address.city"' },
          ", return the value at that path.",
        ],
        [
          "Return ",
          { code: "undefined" },
          " when the path runs out, including when it runs into a value that is not an object, as ",
          { code: '"a.b"' },
          " does on ",
          { code: "{ a: 1 }" },
          ". Nothing should throw.",
        ],
      ],
      starter: `function getPath(object, path) {
  let current = object;
  for (const key of path.split(".")) {
    // Step down one level, or give up.
  }
  return current;
}
`,
      solution: GET_PATH,
      tests: [
        {
          id: "deep",
          name: "A value three levels down",
          code: `const got = getPath({ a: { b: { c: 1 } } }, "a.b.c");
if (got !== 1) throw new Error("got " + got);`,
        },
        {
          id: "shallow",
          name: "A single-segment path",
          code: `const got = getPath({ a: 1 }, "a");
if (got !== 1) throw new Error("got " + got);`,
        },
        {
          id: "missing",
          name: "A path that is not there",
          code: `if (getPath({ a: { b: 1 } }, "a.c") !== undefined) throw new Error("expected undefined");
if (getPath({}, "a.b.c") !== undefined) throw new Error("expected undefined");`,
        },
        {
          id: "through-primitive",
          name: "A path that runs into a number",
          description: "Reading a property of 1 must not throw.",
          code: `if (getPath({ a: 1 }, "a.b") !== undefined) throw new Error("expected undefined");`,
        },
        {
          id: "through-null",
          name: "A path that runs into null",
          code: `if (getPath({ a: null }, "a.b") !== undefined) throw new Error("expected undefined");`,
        },
        {
          id: "arrays",
          name: "Array positions work as segments",
          description: "An index is just another key.",
          code: `const got = getPath({ items: [{ name: "mug" }] }, "items.0.name");
if (got !== "mug") throw new Error("got " + got);`,
        },
      ],
    },
    {
      title: "Fall back when it is missing",
      short: "Fallback",
      solutionNote: [
        'Telling "missing" apart from "stored as null" is the subtle part. Checking for ',
        { code: "undefined" },
        " at the end rather than for falsiness is what keeps a stored ",
        { code: "0" },
        ", ",
        { code: '""' },
        " or ",
        { code: "null" },
        " from being silently replaced by the fallback: the bug that makes a settings loader quietly ignore every value someone deliberately set to zero.",
      ],
      signature:
        "function getPath(object: unknown, path: string, fallback?: unknown): unknown",
      prompt: [
        [
          "Add a third argument. When the path is missing, return ",
          { code: "fallback" },
          " instead of ",
          { code: "undefined" },
          ".",
        ],
        [
          "A value that is genuinely stored must still come back, even when it is falsy: ",
          { code: "0" },
          ", ",
          { code: '""' },
          " and ",
          { code: "null" },
          " are values, not absences. Calling without a fallback keeps the old behaviour, because a missing argument is ",
          { code: "undefined" },
          ".",
        ],
      ],
      starter: `${GET_PATH}`,
      solution: GET_PATH_FALLBACK,
      tests: [
        {
          id: "missing",
          name: "A missing path returns the fallback",
          code: `const got = getPath({ a: 1 }, "a.b.c", "none");
if (got !== "none") throw new Error("got " + got);`,
        },
        {
          id: "present",
          name: "A present value beats the fallback",
          code: `const got = getPath({ a: { b: 2 } }, "a.b", "none");
if (got !== 2) throw new Error("got " + got);`,
        },
        {
          id: "falsy",
          name: "Falsy values are still values",
          code: `if (getPath({ a: 0 }, "a", "none") !== 0) throw new Error("0 was replaced");
if (getPath({ a: "" }, "a", "none") !== "") throw new Error("empty string was replaced");
if (getPath({ a: null }, "a", "none") !== null) throw new Error("null was replaced");`,
        },
        {
          id: "no-fallback",
          name: "Without a fallback, missing is undefined",
          code: `if (getPath({ a: 1 }, "a.b") !== undefined) throw new Error("expected undefined");`,
        },
        {
          id: "through-primitive",
          name: "A path through a number falls back too",
          code: `const got = getPath({ a: 1 }, "a.b", "none");
if (got !== "none") throw new Error("got " + got);`,
        },
      ],
    },
    {
      title: "Write by path",
      short: "Write",
      solutionNote: [
        "Walking to the second-to-last key and assigning to the last is the shape every path-setter has. Replacing a non-object along the way is a real decision rather than an oversight: the alternative is throwing, and a caller who asked to set ",
        { code: "a.b" },
        " on ",
        { code: "{ a: 1 }" },
        " has already told you what they want to happen to the 1.",
      ],
      signature:
        "function setPath(object: object, path: string, value: unknown): object",
      prompt: [
        [
          "Add ",
          { code: "setPath" },
          ", which stores a value at a dotted path and returns the same object it was given.",
        ],
        [
          "Missing levels along the way are created as empty objects, and a level that holds something which is not an object is replaced by one, so ",
          { code: 'setPath({ a: 1 }, "a.b", 2)' },
          " ends up as ",
          { code: "{ a: { b: 2 } }" },
          ".",
        ],
      ],
      starter: `${GET_PATH_FALLBACK}
function setPath(object, path, value) {
  const keys = path.split(".");
  let current = object;
  // Walk to the second-to-last key, creating levels as needed.
  return object;
}
`,
      solution: `${GET_PATH_FALLBACK}
function setPath(object, path, value) {
  const keys = path.split(".");
  let current = object;
  for (const key of keys.slice(0, -1)) {
    if (current[key] === null || typeof current[key] !== "object") current[key] = {};
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return object;
}
`,
      tests: [
        {
          id: "creates",
          name: "Missing levels are created",
          code: `const got = setPath({}, "a.b.c", 1);
if (JSON.stringify(got) !== JSON.stringify({ a: { b: { c: 1 } } })) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "overwrites",
          name: "An existing value is replaced",
          code: `const got = setPath({ a: { b: 1 } }, "a.b", 2);
if (JSON.stringify(got) !== JSON.stringify({ a: { b: 2 } })) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "replaces-primitive",
          name: "A number in the way becomes an object",
          code: `const got = setPath({ a: 1 }, "a.b", 2);
if (JSON.stringify(got) !== JSON.stringify({ a: { b: 2 } })) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "keeps-siblings",
          name: "Sibling keys are left alone",
          code: `const got = setPath({ a: { keep: 1 } }, "a.add", 2);
if (JSON.stringify(got) !== JSON.stringify({ a: { keep: 1, add: 2 } })) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "identity",
          name: "The same object comes back",
          code: `const target = {};
if (setPath(target, "a", 1) !== target) throw new Error("a different object was returned");`,
        },
        {
          id: "round-trip",
          name: "What was written can be read",
          code: `const target = setPath({}, "x.y.z", 7);
if (getPath(target, "x.y.z") !== 7) throw new Error("got " + getPath(target, "x.y.z"));
if (getPath(target, "x.y.q", "none") !== "none") throw new Error("fallback broke");`,
        },
      ],
    },
  ],
);

// ─── Inventory Ledger ────────────────────────────────────────────────

const STOCK_LEVELS = `function stockLevels(events) {
  const levels = new Map();
  for (const [sku, delta] of events) {
    levels.set(sku, (levels.get(sku) ?? 0) + delta);
  }
  return [...levels.keys()].sort().map((sku) => [sku, levels.get(sku)]);
}
`;

const FIRST_NEGATIVE = `${STOCK_LEVELS}
function firstNegative(events) {
  const levels = new Map();
  for (let i = 0; i < events.length; i++) {
    const [sku, delta] = events[i];
    const next = (levels.get(sku) ?? 0) + delta;
    if (next < 0) return i;
    levels.set(sku, next);
  }
  return -1;
}
`;

const INVENTORY_LEDGER = codeSteps(
  {
    slug: "inventory-ledger",
    title: "Inventory Ledger",
    difficulty: "Intermediate",
    topic: "Reducers",
    language: "javascript",
    description:
      "Replay a stream of stock movements: total them per item, find the first one that oversells, then settle the ledger by refusing it.",
    solutionNote: [
      "All three steps are the same fold over the same events; what changes is what the fold does when the running total would go below zero: ignore it, report it, or refuse it. Keeping the running totals in a ",
      { code: "Map" },
      " rather than a plain object is what lets an SKU be any string without colliding with ",
      { code: "Object.prototype" },
      ".",
    ],
  },
  [
    {
      title: "Total the movements",
      short: "Levels",
      solutionNote: [
        "A ",
        { code: "Map" },
        " rather than a plain object is what lets an SKU be any string without colliding with ",
        { code: "Object.prototype" },
        ": a product literally called ",
        { code: '"constructor"' },
        " is unlikely but the failure it causes is baffling. Returning sorted pairs rather than the map keeps the output comparable.",
      ],
      signature:
        "function stockLevels(events: [string, number][]): [string, number][]",
      prompt: [
        [
          "Stock movements arrive as ",
          { code: "[sku, delta]" },
          " pairs: positive for a delivery, negative for a sale. Replay them and return the level of every SKU as ",
          { code: "[sku, quantity]" },
          " pairs, sorted by SKU.",
        ],
        "An SKU whose movements cancel out is still in the ledger, at zero. An empty ledger returns an empty list.",
      ],
      starter: `function stockLevels(events) {
  const levels = new Map();
  for (const [sku, delta] of events) {
    // Add the movement to this SKU's running level.
  }
  return [...levels.keys()].sort().map((sku) => [sku, levels.get(sku)]);
}
`,
      solution: STOCK_LEVELS,
      tests: [
        {
          id: "basic",
          name: "Movements are totalled per SKU",
          code: `const got = stockLevels([["a", 5], ["b", 2], ["a", -3]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 2], ["b", 2]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "sorted",
          name: "The result is sorted by SKU",
          code: `const got = stockLevels([["b", 1], ["a", 1]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 1], ["b", 1]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "zero",
          name: "An SKU that nets to zero still appears",
          code: `const got = stockLevels([["a", 1], ["a", -1]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 0]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "empty",
          name: "An empty ledger",
          code: `if (JSON.stringify(stockLevels([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "negative",
          name: "Levels may go negative at this stage",
          description: "Step 2 is where overselling starts to matter.",
          code: `const got = stockLevels([["a", 1], ["a", -4]]);
if (JSON.stringify(got) !== JSON.stringify([["a", -3]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
      ],
    },
    {
      title: "Find the first oversell",
      short: "Oversell",
      solutionNote: [
        "Computing the level the movement ",
        { code: "would" },
        " produce, before committing it, is what makes this a check rather than a repair. Note that only the SKU being moved is consulted: stock of one item cannot cover a sale of another, however healthy the total looks.",
      ],
      signature: "function firstNegative(events: [string, number][]): number",
      prompt: [
        [
          "Add ",
          { code: "firstNegative" },
          ", which returns the index of the first movement that would take an SKU below zero, or ",
          { code: "-1" },
          " when the ledger is clean.",
        ],
        "Landing exactly on zero is fine: you can sell the last one. Only the SKU being moved matters; another SKU sitting at zero is not a problem.",
      ],
      starter: `${STOCK_LEVELS}
function firstNegative(events) {
  const levels = new Map();
  for (let i = 0; i < events.length; i++) {
    // Would this movement take the SKU below zero?
  }
  return -1;
}
`,
      solution: FIRST_NEGATIVE,
      tests: [
        {
          id: "finds",
          name: "The offending movement is reported by index",
          code: `const got = firstNegative([["a", 1], ["a", -2]]);
if (got !== 1) throw new Error("got " + got);`,
        },
        {
          id: "clean",
          name: "A clean ledger reports -1",
          code: `const got = firstNegative([["a", 5], ["a", -3], ["b", 1]]);
if (got !== -1) throw new Error("got " + got);`,
        },
        {
          id: "zero-ok",
          name: "Landing exactly on zero is fine",
          code: `const got = firstNegative([["a", 1], ["a", -1]]);
if (got !== -1) throw new Error("got " + got);`,
        },
        {
          id: "per-sku",
          name: "Each SKU is tracked separately",
          description: "Stock of one item cannot cover a sale of another.",
          code: `const got = firstNegative([["a", 5], ["b", -1]]);
if (got !== 1) throw new Error("got " + got);`,
        },
        {
          id: "empty",
          name: "An empty ledger is clean",
          code: `if (firstNegative([]) !== -1) throw new Error("got " + firstNegative([]));`,
        },
        {
          id: "levels-survive",
          name: "stockLevels still works",
          code: `const got = stockLevels([["a", 2]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 2]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
      ],
    },
    {
      title: "Settle the ledger",
      short: "Settle",
      solutionNote: [
        "The three steps are the same fold over the same events; what changes is what the fold does when the running total would go below zero: ignore it, report it, or refuse it. Refusing means a later movement for that SKU still applies against the level it actually had, which is what makes the settled ledger internally consistent.",
      ],
      signature:
        "function settle(events: [string, number][]): [string, number][]",
      prompt: [
        [
          "Add ",
          { code: "settle" },
          ", which replays the ledger but refuses any movement that would take an SKU below zero, and returns the final levels in the same shape as step 1.",
        ],
        "A refused movement is skipped entirely; later movements for that SKU still apply against the level it actually had. An SKU whose only movement was refused never enters the ledger at all.",
      ],
      starter: `${FIRST_NEGATIVE}
function settle(events) {
  const levels = new Map();
  for (const [sku, delta] of events) {
    // Apply the movement, unless it would oversell.
  }
  return [...levels.keys()].sort().map((sku) => [sku, levels.get(sku)]);
}
`,
      solution: `${FIRST_NEGATIVE}
function settle(events) {
  const levels = new Map();
  for (const [sku, delta] of events) {
    const next = (levels.get(sku) ?? 0) + delta;
    if (next < 0) continue;
    levels.set(sku, next);
  }
  return [...levels.keys()].sort().map((sku) => [sku, levels.get(sku)]);
}
`,
      tests: [
        {
          id: "refuses",
          name: "An overselling movement is skipped",
          description: "5, refuse -7, then -2 leaves 3.",
          code: `const got = settle([["a", 5], ["a", -7], ["a", -2]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 3]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "never-enters",
          name: "An SKU whose only movement is refused never appears",
          code: `if (JSON.stringify(settle([["a", -1]])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "mixed",
          name: "Other SKUs are unaffected",
          code: `const got = settle([["a", 1], ["b", -1], ["b", 2]]);
if (JSON.stringify(got) !== JSON.stringify([["a", 1], ["b", 2]])) {
  throw new Error("got " + JSON.stringify(got));
}`,
        },
        {
          id: "clean",
          name: "A clean ledger settles to its totals",
          code: `const events = [["a", 5], ["a", -3], ["b", 1]];
if (JSON.stringify(settle(events)) !== JSON.stringify(stockLevels(events))) {
  throw new Error("got " + JSON.stringify(settle(events)));
}`,
        },
        {
          id: "empty",
          name: "An empty ledger",
          code: `if (JSON.stringify(settle([])) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `if (firstNegative([["a", 1], ["a", -2]]) !== 1) throw new Error("firstNegative broke");
if (JSON.stringify(stockLevels([["a", -3]])) !== JSON.stringify([["a", -3]])) {
  throw new Error("stockLevels broke");
}`,
        },
      ],
    },
  ],
);

// ─── Paginate Results ────────────────────────────────────────────────

const PAGE_OF = `function pageOf(items, page, size) {
  if (page < 1 || size < 1) return [];
  const start = (page - 1) * size;
  return items.slice(start, start + size);
}
`;

const PAGE_COUNT = `${PAGE_OF}
function pageCount(total, size) {
  if (size < 1 || total < 1) return 0;
  return Math.ceil(total / size);
}
`;

const PAGINATE_RESULTS = codeSteps(
  {
    slug: "paginate-results",
    title: "Paginate Results",
    difficulty: "Beginner",
    topic: "Pagination",
    language: "javascript",
    description:
      "Build the pagination an API response needs: the slice for one page, how many pages there are, then the payload around them.",
    solutionNote: [
      "Pages are 1-based because that is what a reader sees, and array indices are 0-based, so exactly one subtraction, ",
      { code: "(page - 1) * size" },
      ", bridges them. Getting that in one place, rather than in every caller, is the entire reason this is a function.",
    ],
  },
  [
    {
      title: "Slice one page",
      short: "Slice",
      solutionNote: [
        "Pages are 1-based because that is what a reader sees, and array indices are 0-based, so exactly one subtraction bridges them. Getting that in one place rather than in every caller is the entire reason this is a function.",
      ],
      signature:
        "function pageOf(items: unknown[], page: number, size: number): unknown[]",
      prompt: [
        [
          "Return the items on a given page. Pages are numbered from 1, so page 1 of size 2 is the first two items.",
        ],
        [
          "A page past the end returns an empty list rather than throwing, and so does a ",
          { code: "page" },
          " below 1 or a ",
          { code: "size" },
          " below 1. The last page may be short.",
        ],
      ],
      starter: `function pageOf(items, page, size) {
  if (page < 1 || size < 1) return [];
  // Pages count from 1; array indices count from 0.
  return [];
}
`,
      solution: PAGE_OF,
      tests: [
        {
          id: "first",
          name: "The first page",
          code: `const got = pageOf([1, 2, 3, 4, 5], 1, 2);
if (JSON.stringify(got) !== "[1,2]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "middle",
          name: "A page in the middle",
          code: `const got = pageOf([1, 2, 3, 4, 5], 2, 2);
if (JSON.stringify(got) !== "[3,4]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "short-last",
          name: "The last page may be short",
          code: `const got = pageOf([1, 2, 3, 4, 5], 3, 2);
if (JSON.stringify(got) !== "[5]") throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "past-end",
          name: "A page past the end is empty",
          code: `if (JSON.stringify(pageOf([1, 2], 9, 2)) !== "[]") throw new Error("expected []");`,
        },
        {
          id: "bad-arguments",
          name: "Page or size below 1",
          code: `if (JSON.stringify(pageOf([1, 2], 0, 2)) !== "[]") throw new Error("page 0 should be empty");
if (JSON.stringify(pageOf([1, 2], 1, 0)) !== "[]") throw new Error("size 0 should be empty");`,
        },
      ],
    },
    {
      title: "Count the pages",
      short: "Count",
      solutionNote: [
        'Zero items means zero pages, not one empty page. It looks like a nitpick until a UI renders "Page 1 of 1" over an empty list and someone files a bug asking where their data went.',
      ],
      signature: "function pageCount(total: number, size: number): number",
      prompt: [
        [
          "Add ",
          { code: "pageCount" },
          ", which says how many pages a total of items fills at a given page size. A partial last page still counts.",
        ],
        [
          "No items means no pages: ",
          { code: "0" },
          ", not ",
          { code: "1" },
          ". A size below 1 also has no pages.",
        ],
      ],
      starter: `${PAGE_OF}
function pageCount(total, size) {
  if (size < 1 || total < 1) return 0;
  // A partial last page still counts as a page.
  return 0;
}
`,
      solution: PAGE_COUNT,
      tests: [
        {
          id: "partial",
          name: "A partial last page counts",
          code: `if (pageCount(5, 2) !== 3) throw new Error("got " + pageCount(5, 2));`,
        },
        {
          id: "exact",
          name: "An exact fit",
          code: `if (pageCount(4, 2) !== 2) throw new Error("got " + pageCount(4, 2));`,
        },
        {
          id: "one-page",
          name: "Fewer items than a page holds",
          code: `if (pageCount(1, 10) !== 1) throw new Error("got " + pageCount(1, 10));`,
        },
        {
          id: "empty",
          name: "No items, no pages",
          code: `if (pageCount(0, 2) !== 0) throw new Error("got " + pageCount(0, 2));`,
        },
        {
          id: "bad-size",
          name: "A size below 1",
          code: `if (pageCount(5, 0) !== 0) throw new Error("got " + pageCount(5, 0));`,
        },
        {
          id: "page-of-survives",
          name: "pageOf still works",
          code: `const got = pageOf([1, 2, 3], 2, 2);
if (JSON.stringify(got) !== "[3]") throw new Error("got " + JSON.stringify(got));`,
        },
      ],
    },
    {
      title: "Assemble the payload",
      short: "Payload",
      solutionNote: [
        "Composing the two functions rather than recomputing the arithmetic is what keeps the payload honest: ",
        { code: "hasNext" },
        " and the items can never disagree, because both derive from the same page count. A payload assembled from independent calculations is where off-by-one pagination bugs live.",
      ],
      signature:
        "function paginate(items: unknown[], page: number, size: number): object",
      prompt: [
        [
          "Finish with ",
          { code: "paginate" },
          ", which returns the object an API would send: ",
          { code: "items" },
          ", ",
          { code: "page" },
          ", ",
          { code: "pageCount" },
          ", ",
          { code: "hasPrevious" },
          " and ",
          { code: "hasNext" },
          ".",
        ],
        [
          { code: "hasPrevious" },
          " is true when the page is above 1; ",
          { code: "hasNext" },
          " is true when there is a page after this one. Build it from the two functions you already have rather than recomputing anything.",
        ],
      ],
      starter: `${PAGE_COUNT}
function paginate(items, page, size) {
  const pages = pageCount(items.length, size);
  // Assemble the payload from the two functions above.
  return {};
}
`,
      solution: `${PAGE_COUNT}
function paginate(items, page, size) {
  const pages = pageCount(items.length, size);
  return {
    items: pageOf(items, page, size),
    page,
    pageCount: pages,
    hasPrevious: page > 1,
    hasNext: page < pages,
  };
}
`,
      tests: [
        {
          id: "middle",
          name: "A page in the middle",
          code: `const got = paginate([1, 2, 3, 4, 5], 2, 2);
if (JSON.stringify(got.items) !== "[3,4]") throw new Error("items: " + JSON.stringify(got.items));
if (got.page !== 2) throw new Error("page: " + got.page);
if (got.pageCount !== 3) throw new Error("pageCount: " + got.pageCount);
if (got.hasPrevious !== true) throw new Error("hasPrevious: " + got.hasPrevious);
if (got.hasNext !== true) throw new Error("hasNext: " + got.hasNext);`,
        },
        {
          id: "first",
          name: "The first page has nothing before it",
          code: `const got = paginate([1, 2, 3], 1, 2);
if (got.hasPrevious !== false) throw new Error("hasPrevious: " + got.hasPrevious);
if (got.hasNext !== true) throw new Error("hasNext: " + got.hasNext);`,
        },
        {
          id: "last",
          name: "The last page has nothing after it",
          code: `const got = paginate([1, 2, 3], 2, 2);
if (JSON.stringify(got.items) !== "[3]") throw new Error("items: " + JSON.stringify(got.items));
if (got.hasNext !== false) throw new Error("hasNext: " + got.hasNext);`,
        },
        {
          id: "empty",
          name: "No items at all",
          code: `const got = paginate([], 1, 10);
if (JSON.stringify(got.items) !== "[]") throw new Error("items: " + JSON.stringify(got.items));
if (got.pageCount !== 0) throw new Error("pageCount: " + got.pageCount);
if (got.hasNext !== false) throw new Error("hasNext: " + got.hasNext);
if (got.hasPrevious !== false) throw new Error("hasPrevious: " + got.hasPrevious);`,
        },
        {
          id: "past-end",
          name: "A page past the end",
          code: `const got = paginate([1, 2, 3], 9, 2);
if (JSON.stringify(got.items) !== "[]") throw new Error("items: " + JSON.stringify(got.items));
if (got.hasNext !== false) throw new Error("hasNext: " + got.hasNext);
if (got.hasPrevious !== true) throw new Error("hasPrevious: " + got.hasPrevious);`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `if (JSON.stringify(pageOf([1, 2, 3], 1, 2)) !== "[1,2]") throw new Error("pageOf broke");
if (pageCount(5, 2) !== 3) throw new Error("pageCount broke");`,
        },
      ],
    },
  ],
);

export const CODE_MULTI_JS: Challenge[] = [
  MATRIX_ROTATION,
  NESTED_LOOKUP,
  INVENTORY_LEDGER,
  PAGINATE_RESULTS,
];
