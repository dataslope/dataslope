/**
 * Multi-step JavaScript challenges: small applications.
 *
 * A shopping cart, an editor's undo history, an event emitter, a line diff, a
 * cron scheduler, a CSV parser and the Game of Life. Each is the core of a
 * program people use every day, built in the order it would really be
 * written: the plain version first, then the requirement that breaks it. A
 * half cent of tax, a redo after a fresh edit, a listener that emits from
 * inside itself, a line break inside quotes: the later steps are where the
 * naive version quietly gives a wrong answer.
 *
 * Everything is a pure function of its arguments or a class the checks drive
 * call by call, and the scheduler takes the current time as an argument rather
 * than reading a clock, so every check is deterministic. Checks that are one
 * call and one return value go through `jsCases`; classes and call sequences
 * are written by hand. `__tests__/challengeSolutions` runs every step's
 * reference solution under `node`.
 */

import { codeSteps } from "./authoring";
import { jsCases } from "./cases";
import type { Challenge } from "./types";

/** An assertion for hand-written checks, prepended to their bodies. */
const SAME = `const same = (label, got, want) => {
  if (JSON.stringify(got) !== JSON.stringify(want)) {
    throw new Error(label + ": expected " + JSON.stringify(want) + ", got " + JSON.stringify(got));
  }
};`;

// ─── Shopping cart ───────────────────────────────────────────────────

const SUBTOTAL = `function subtotalCents(items) {
  let total = 0;
  for (const { sku, priceCents, qty } of items) {
    if (!Number.isInteger(priceCents) || priceCents < 0) {
      throw new RangeError(sku + ": priceCents must be a whole number of cents, got " + priceCents);
    }
    if (!Number.isInteger(qty) || qty < 0) {
      throw new RangeError(sku + ": qty must be a whole number, got " + qty);
    }
    total += priceCents * qty;
  }
  return total;
}
`;

const DISCOUNTED = `${SUBTOTAL}
function discountedCents(subtotal, discount) {
  if (discount === null) return subtotal;
  let off;
  if (discount.type === "percent") off = Math.floor((subtotal * discount.percent) / 100);
  else if (discount.type === "fixed") off = discount.cents;
  else throw new Error("unknown discount type: " + discount.type);
  return Math.max(0, subtotal - off);
}
`;

const CART_ITEMS = [
  { sku: "TEA-01", priceCents: 450, qty: 2 },
  { sku: "MUG-02", priceCents: 1299, qty: 1 },
];

const SHOPPING_CART = codeSteps(
  {
    slug: "shopping-cart",
    title: "Shopping Cart",
    difficulty: "Beginner",
    topic: "Money in integer cents",
    language: "javascript",
    description:
      "Total a cart in whole cents, apply a discount code, then add tax rounded to the cent without a floating-point slip.",
    solutionNote:
      "Keeping every amount in whole cents makes addition exact, so the only places a cent can go missing are the two divisions: the percentage discount and the tax. Doing each in integer arithmetic (multiply first, divide last) and rounding exactly once is what stops `1400 * 0.35` from quietly taking off a cent too few.",
  },
  [
    {
      title: "Add up the cart",
      short: "Subtotal",
      solutionNote:
        "`Number.isInteger` is the whole guard: it rejects `4.5`, `NaN` and the string `\"450\"` alike, and once every input is a whole number the sum is exact, because a double adds integers without rounding up to 2⁵³. Money code goes wrong when it stores dollars, where `0.1 + 0.2` is already `0.30000000000000004`.",
      signature:
        "function subtotalCents(items: { sku: string, priceCents: number, qty: number }[]): number",
      prompt: [
        'A cart is a list of line items like `{ sku: "TEA-01", priceCents: 450, qty: 2 }`. Return the subtotal in cents: each line\'s `priceCents` times its `qty`, added up. An empty cart costs `0`, and a line with a `qty` of `0` adds nothing.',
        "Prices are whole cents precisely so that adding them up is exact. If a line's `priceCents` or `qty` is not a non-negative whole number (a price of `4.5` is almost certainly dollars that slipped through), throw a `RangeError` rather than guess.",
      ],
      starter: `function subtotalCents(items) {
  let total = 0;
  // Check each line holds whole numbers, then add priceCents * qty.
  return total;
}
`,
      solution: SUBTOTAL,
      tests: [
        ...jsCases("subtotalCents", [
          { id: "two-lines", name: "Two line items", args: [CART_ITEMS], expected: 2199 },
          { id: "empty", name: "An empty cart", args: [[]], expected: 0 },
          {
            id: "zero-qty",
            name: "A line with quantity zero",
            args: [
              [
                { sku: "GIFT-BAG", priceCents: 99, qty: 0 },
                { sku: "CARD-01", priceCents: 350, qty: 3 },
              ],
            ],
            expected: 1050,
          },
          {
            id: "free",
            name: "A free item",
            args: [
              [
                { sku: "SAMPLE-9", priceCents: 0, qty: 4 },
                { sku: "SOAP-03", priceCents: 1999, qty: 250 },
              ],
            ],
            expected: 499750,
          },
        ]),
        {
          id: "rejects",
          name: "Amounts that are not whole numbers are rejected",
          description: "A price of 4.5, a quantity of 1.5, a negative quantity and a price given as text each throw a RangeError.",
          code: `const bad = [
  { sku: "TEA-01", priceCents: 4.5, qty: 1 },
  { sku: "TEA-01", priceCents: 450, qty: 1.5 },
  { sku: "TEA-01", priceCents: 450, qty: -1 },
  { sku: "TEA-01", priceCents: "450", qty: 1 },
];
for (const line of bad) {
  let error = null;
  try { subtotalCents([line]); } catch (e) { error = e; }
  if (!(error instanceof RangeError)) {
    throw new Error("expected a RangeError for " + JSON.stringify(line) + ", got " + (error ? error.name : "no error"));
  }
}`,
        },
        {
          id: "no-mutation",
          name: "The cart is left alone",
          code: `const items = [{ sku: "TEA-01", priceCents: 450, qty: 2 }];
subtotalCents(items);
if (JSON.stringify(items) !== '[{"sku":"TEA-01","priceCents":450,"qty":2}]') {
  throw new Error("the cart changed: " + JSON.stringify(items));
}`,
        },
      ],
    },
    {
      title: "Apply a discount code",
      short: "Discount",
      solutionNote:
        "Multiply before you divide: `Math.floor(subtotal * percent / 100)` floors an exact integer product, where `subtotal * (percent / 100)` first turns 35% into `0.35`, which a double cannot hold exactly, and `1400 * 0.35` comes out as `489.99999999999994`. `Math.max(0, ...)` is the other half: a fixed code worth more than the cart must not become a refund.",
      signature: `type Discount =
  | { type: "percent", percent: number }  // a whole percentage, 1 to 100
  | { type: "fixed", cents: number };

function discountedCents(subtotal: number, discount: Discount | null): number`,
      prompt: [
        "Add `discountedCents`, which takes a subtotal in cents and the discount a code unlocks, and returns the subtotal after the discount. `null` means no code was entered.",
        'A `{ type: "percent", percent: 15 }` code takes 15% off, rounded down to a whole cent so the shop never gives away more than it advertised: 15% of `2199` is `329.85`, so `329` comes off. A `{ type: "fixed", cents: 500 }` code takes 500 cents off.',
        "A discount never pushes the price below zero: 1,000 cents off a 700-cent cart leaves `0`. Any other `type` is a bug upstream, so throw an `Error`.",
      ],
      starter: `${SUBTOTAL}
function discountedCents(subtotal, discount) {
  if (discount === null) return subtotal;
  // Percent codes round the amount off down; fixed codes take cents off. Never go below zero.
  return subtotal;
}
`,
      solution: DISCOUNTED,
      tests: [
        ...jsCases("discountedCents", [
          { id: "none", name: "No code", args: [2199, null], expected: 2199 },
          {
            id: "percent",
            name: "15% off rounds the discount down",
            args: [2199, { type: "percent", percent: 15 }],
            expected: 1870,
          },
          {
            id: "fixed",
            name: "A fixed amount off",
            args: [2199, { type: "fixed", cents: 500 }],
            expected: 1699,
          },
          {
            id: "float-trap",
            name: "35% off 1400 takes off exactly 490",
            description: "1400 times 0.35 is 489.99999999999994 in floating point.",
            args: [1400, { type: "percent", percent: 35 }],
            expected: 910,
          },
          {
            id: "floor-zero",
            name: "A fixed code bigger than the cart",
            args: [700, { type: "fixed", cents: 1000 }],
            expected: 0,
          },
          {
            id: "all-off",
            name: "100% off",
            args: [2199, { type: "percent", percent: 100 }],
            expected: 0,
          },
          {
            id: "unknown",
            name: "An unknown discount type throws",
            args: [2199, { type: "bogo" }],
            throws: true,
          },
        ]),
        {
          id: "subtotal-survives",
          name: "subtotalCents still works",
          code: `const got = subtotalCents([{ sku: "TEA-01", priceCents: 450, qty: 2 }]);
if (got !== 900) throw new Error("got " + got);`,
        },
      ],
    },
    {
      title: "Add tax and total",
      short: "Checkout",
      solutionNote:
        "Adding half the divisor before a floor division, `Math.floor((cents * basisPoints + 5000) / 10000)`, rounds half up on an exact integer, so half a cent is seen as exactly half. Converting the rate to a fraction first loses that: `200 * 0.0725` is `14.499999999999998`, and `Math.round` charges 14 cents where the rule says 15.",
      signature: `function checkout(
  items: { sku: string, priceCents: number, qty: number }[],
  discount: Discount | null,
  taxBasisPoints: number,
): { subtotal: number, discount: number, tax: number, total: number }`,
      prompt: [
        "Add `checkout`, which prices a whole order. It returns four amounts in cents: the `subtotal` from step 1, the `discount` actually taken off (after the zero floor, so never more than the subtotal), the `tax`, and the `total` to charge, which is the discounted subtotal plus the tax.",
        "Tax is charged on the discounted subtotal, not the original. The rate arrives in basis points, hundredths of a percent, so `825` means 8.25%: that keeps the rate a whole number too.",
        "Round the tax to the nearest cent, with an exact half cent rounding up: 7.25% of 200 cents is 14.5, which is charged as `15`.",
      ],
      starter: `${DISCOUNTED}
function checkout(items, discount, taxBasisPoints) {
  const subtotal = subtotalCents(items);
  // Discount, then tax the discounted amount, rounding half a cent up.
  return { subtotal, discount: 0, tax: 0, total: subtotal };
}
`,
      solution: `${DISCOUNTED}
function checkout(items, discount, taxBasisPoints) {
  const subtotal = subtotalCents(items);
  const discounted = discountedCents(subtotal, discount);
  const tax = Math.floor((discounted * taxBasisPoints + 5000) / 10000);
  return { subtotal, discount: subtotal - discounted, tax, total: discounted + tax };
}
`,
      tests: [
        ...jsCases("checkout", [
          {
            id: "full",
            name: "A 15% code and 8.25% tax",
            args: [CART_ITEMS, { type: "percent", percent: 15 }, 825],
            expected: { subtotal: 2199, discount: 329, tax: 154, total: 2024 },
          },
          {
            id: "half-cent",
            name: "Half a cent rounds up",
            description: "7.25% of 200 cents is exactly 14.5.",
            args: [[{ sku: "PEN-01", priceCents: 100, qty: 2 }], null, 725],
            expected: { subtotal: 200, discount: 0, tax: 15, total: 215 },
          },
          {
            id: "after-discount",
            name: "Tax is charged after the discount",
            description: "7.25% of 3400 is 246.5; charging it on 4000 would give 290.",
            args: [[{ sku: "LAMP-07", priceCents: 4000, qty: 1 }], { type: "fixed", cents: 600 }, 725],
            expected: { subtotal: 4000, discount: 600, tax: 247, total: 3647 },
          },
          {
            id: "no-tax",
            name: "A zero tax rate",
            args: [CART_ITEMS, null, 0],
            expected: { subtotal: 2199, discount: 0, tax: 0, total: 2199 },
          },
          {
            id: "capped",
            name: "A code worth more than the cart",
            description: "The discount reported is what was actually taken off.",
            args: [[{ sku: "MUG-02", priceCents: 1299, qty: 1 }], { type: "fixed", cents: 2000 }, 825],
            expected: { subtotal: 1299, discount: 1299, tax: 0, total: 0 },
          },
          {
            id: "empty",
            name: "An empty cart",
            args: [[], { type: "percent", percent: 10 }, 825],
            expected: { subtotal: 0, discount: 0, tax: 0, total: 0 },
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier steps still work",
          code: `if (discountedCents(1400, { type: "percent", percent: 35 }) !== 910) throw new Error("discountedCents broke");
let threw = false;
try { checkout([{ sku: "TEA-01", priceCents: 4.5, qty: 1 }], null, 825); } catch { threw = true; }
if (!threw) throw new Error("a price in dollars should still be rejected");`,
        },
      ],
    },
  ],
);

// ─── Text editor history ─────────────────────────────────────────────

const APPLY_OP = `function applyOp(text, op) {
  if (op.type === "insert") {
    if (!Number.isInteger(op.at) || op.at < 0 || op.at > text.length) {
      throw new RangeError("insert position " + op.at + " is outside 0.." + text.length);
    }
    return text.slice(0, op.at) + op.text + text.slice(op.at);
  }
  if (op.type === "delete") {
    const { from, to } = op;
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > to || to > text.length) {
      throw new RangeError("delete range " + from + ".." + to + " is outside 0.." + text.length);
    }
    return text.slice(0, from) + text.slice(to);
  }
  throw new Error("unknown operation: " + op.type);
}
`;

const INVERSE_OF = `function inverseOf(text, op) {
  if (op.type === "insert") return { type: "delete", from: op.at, to: op.at + op.text.length };
  return { type: "insert", at: op.from, text: text.slice(op.from, op.to) };
}
`;

const EDITOR_UNDO = `${APPLY_OP}
${INVERSE_OF}
class Editor {
  #text;
  #done = [];

  constructor(text = "") {
    this.#text = text;
  }

  get text() {
    return this.#text;
  }

  apply(op) {
    const next = applyOp(this.#text, op);
    if (next === this.#text) return;
    this.#done.push(inverseOf(this.#text, op));
    this.#text = next;
  }

  undo() {
    const inverse = this.#done.pop();
    if (!inverse) return false;
    this.#text = applyOp(this.#text, inverse);
    return true;
  }
}
`;

const EDITOR_REDO = `${APPLY_OP}
${INVERSE_OF}
class Editor {
  #text;
  #done = [];
  #undone = [];

  constructor(text = "") {
    this.#text = text;
  }

  get text() {
    return this.#text;
  }

  apply(op) {
    const next = applyOp(this.#text, op);
    if (next === this.#text) return;
    this.#done.push({ op, inverse: inverseOf(this.#text, op) });
    this.#undone = [];
    this.#text = next;
  }

  undo() {
    const entry = this.#done.pop();
    if (!entry) return false;
    this.#text = applyOp(this.#text, entry.inverse);
    this.#undone.push(entry);
    return true;
  }

  redo() {
    const entry = this.#undone.pop();
    if (!entry) return false;
    this.#text = applyOp(this.#text, entry.op);
    this.#done.push(entry);
    return true;
  }
}
`;

const OP_TYPE = `type Op =
  | { type: "insert", at: number, text: string }
  | { type: "delete", from: number, to: number };`;

const TEXT_EDITOR_HISTORY = codeSteps(
  {
    slug: "text-editor-history",
    title: "Text Editor Undo",
    difficulty: "Intermediate",
    topic: "Command history",
    language: "javascript",
    description:
      "Apply insert and delete edits to a document, then give the editor an undo, and a redo that a fresh edit clears.",
    solutionNote:
      "Each edit is recorded with its inverse, worked out before the edit runs, because just before a delete is the last moment the removed text still exists. Undo applies the inverse and moves the entry to a redo stack, redo re-applies the original, and any new edit empties the redo stack, since those edits were made against a document that no longer exists.",
  },
  [
    {
      title: "Apply an edit",
      short: "Apply",
      solutionNote:
        "Both edits are two `slice` calls around the edit point, and giving delete `slice`'s half-open range means `to - from` is the number of characters removed, so an empty range is simply `from === to`. Validating first matters because `slice` never complains: it clamps an out-of-range index, and a clamped edit lands somewhere the caller did not ask for.",
      signature: `${OP_TYPE}

function applyOp(text: string, op: Op): string`,
      prompt: [
        'A document is a string, and an edit is one of two operations. `{ type: "insert", at: 5, text: ", there" }` puts the text before position 5. `{ type: "delete", from: 5, to: 11 }` removes the characters from index 5 up to but not including 11, the way `slice` counts.',
        "Return the new string. Positions run from `0` to the length of the text inclusive, so inserting at the length appends. Throw a `RangeError` for a position outside that range, or for a delete whose `from` is after its `to`, rather than quietly clamping it.",
      ],
      starter: `function applyOp(text, op) {
  // Two slices around the edit point; reject positions outside 0..text.length.
  return text;
}
`,
      solution: APPLY_OP,
      tests: [
        ...jsCases("applyOp", [
          {
            id: "insert",
            name: "Insert in the middle",
            args: ["hello world", { type: "insert", at: 5, text: ", there" }],
            expected: "hello, there world",
          },
          {
            id: "delete",
            name: "Delete a range",
            args: ["hello world", { type: "delete", from: 5, to: 11 }],
            expected: "hello",
          },
          {
            id: "insert-start",
            name: "Insert at the start",
            args: ["world", { type: "insert", at: 0, text: "hello " }],
            expected: "hello world",
          },
          {
            id: "insert-end",
            name: "Insert at the end appends",
            args: ["hello", { type: "insert", at: 5, text: "!" }],
            expected: "hello!",
          },
          {
            id: "empty-range",
            name: "An empty range deletes nothing",
            args: ["abc", { type: "delete", from: 1, to: 1 }],
            expected: "abc",
          },
          {
            id: "delete-all",
            name: "Delete everything",
            args: ["abc", { type: "delete", from: 0, to: 3 }],
            expected: "",
          },
        ]),
        {
          id: "out-of-range",
          name: "Positions outside the text throw a RangeError",
          description: "Inserting past the end, deleting past the end, and a backwards range.",
          code: `const bad = [
  { type: "insert", at: 6, text: "x" },
  { type: "insert", at: -1, text: "x" },
  { type: "delete", from: 3, to: 9 },
  { type: "delete", from: 3, to: 2 },
];
for (const op of bad) {
  let error = null;
  try { applyOp("hello", op); } catch (e) { error = e; }
  if (!(error instanceof RangeError)) {
    throw new Error("expected a RangeError for " + JSON.stringify(op) + ", got " + (error ? error.name : "no error"));
  }
}`,
        },
      ],
    },
    {
      title: "Undo",
      short: "Undo",
      solutionNote:
        "Record the inverse of each edit before applying it: the inverse of an insert is a delete over the inserted range, and the inverse of a delete is an insert of the text it is about to remove, read with `slice` while it is still there. Storing inverses rather than snapshots of the whole document keeps each history entry the size of the edit.",
      signature: `class Editor {
  constructor(text?: string)
  get text(): string
  apply(op: Op): void
  undo(): boolean
}`,
      prompt: [
        'Wrap the document in an `Editor` class. `new Editor("hello")` starts with that text (an empty string if none is given), `editor.text` reads it, and `editor.apply(op)` edits it with `applyOp`.',
        "`editor.undo()` reverses the most recent edit that has not been undone yet and returns `true`. With nothing left to undo it returns `false` and changes nothing, so undoing repeatedly walks back to the original text and then stops.",
        "An edit that throws must leave both the text and the history alone. An edit that changes nothing (an empty insert, or a delete of an empty range) is not recorded, so undo never spends a call on it.",
      ],
      starter: `${APPLY_OP}
class Editor {
  #text;

  constructor(text = "") {
    this.#text = text;
  }

  get text() {
    return this.#text;
  }

  apply(op) {
    // Record how to reverse this edit before making it.
    this.#text = applyOp(this.#text, op);
  }

  undo() {
    return false;
  }
}
`,
      solution: EDITOR_UNDO,
      tests: [
        {
          id: "undo-last",
          name: "Undo reverses the last edit",
          code: `${SAME}
const e = new Editor("hello world");
e.apply({ type: "delete", from: 5, to: 11 });
e.apply({ type: "insert", at: 5, text: ", there" });
same("text after two edits", e.text, "hello, there");
same("undo()", e.undo(), true);
same("text after one undo", e.text, "hello");`,
        },
        {
          id: "walk-back",
          name: "Undo walks back to the original, then stops",
          code: `${SAME}
const e = new Editor("hello world");
e.apply({ type: "delete", from: 5, to: 11 });
e.apply({ type: "insert", at: 5, text: ", there" });
e.undo();
same("second undo()", e.undo(), true);
same("text after two undos", e.text, "hello world");
same("third undo()", e.undo(), false);
same("text after a spare undo", e.text, "hello world");`,
        },
        {
          id: "undo-delete",
          name: "Undoing a delete restores the removed text",
          code: `${SAME}
const e = new Editor("The quick brown fox");
e.apply({ type: "delete", from: 4, to: 10 });
same("text after the delete", e.text, "The brown fox");
e.undo();
same("text after undo", e.text, "The quick brown fox");`,
        },
        {
          id: "failed-edit",
          name: "An edit that throws is not recorded",
          code: `${SAME}
const e = new Editor("abc");
e.apply({ type: "insert", at: 1, text: "X" });
let threw = false;
try { e.apply({ type: "delete", from: 2, to: 9 }); } catch { threw = true; }
same("threw", threw, true);
same("text after the failed edit", e.text, "aXbc");
e.undo();
same("text after undo", e.text, "abc");
same("a second undo()", e.undo(), false);`,
        },
        {
          id: "no-op",
          name: "An edit that changes nothing is not recorded",
          code: `${SAME}
const e = new Editor("abc");
e.apply({ type: "insert", at: 3, text: "d" });
e.apply({ type: "delete", from: 1, to: 1 });
e.apply({ type: "insert", at: 0, text: "" });
e.undo();
same("text after one undo", e.text, "abc");
same("a second undo()", e.undo(), false);`,
        },
        {
          id: "empty-start",
          name: "A new editor starts empty",
          code: `${SAME}
const e = new Editor();
same("text", e.text, "");
same("undo()", e.undo(), false);
e.apply({ type: "insert", at: 0, text: "hi" });
same("text after typing", e.text, "hi");`,
        },
        {
          id: "many",
          name: "Undo walks back a thousand edits",
          code: `${SAME}
const e = new Editor();
for (let i = 0; i < 1000; i++) e.apply({ type: "insert", at: i, text: String(i % 10) });
same("length after typing", e.text.length, 1000);
let undone = 0;
while (e.undo()) undone++;
same("edits undone", undone, 1000);
same("text", e.text, "");`,
        },
      ],
    },
    {
      title: "Redo",
      short: "Redo",
      solutionNote:
        "Two stacks carry the whole thing: undo pops from the done stack and pushes onto the undone stack, redo does the reverse, and each entry keeps both the edit and its inverse so either direction is one `applyOp`. Clearing the undone stack on every recorded edit is the rule that matters, since redoing an edit onto a document it was never made against would put text at a position that now means something else.",
      signature: `class Editor {
  // ...everything from step 2, plus:
  redo(): boolean
}`,
      prompt: [
        "Add `editor.redo()`, which re-applies the most recently undone edit and returns `true`, or returns `false` when there is nothing to redo. Undo and redo can alternate any number of times: undo twice, redo twice, and you are back where you started.",
        "A new edit after an undo starts a new branch of history, so it clears everything waiting to be redone: type, undo, type something else, and `redo()` returns `false`. An edit that changes nothing is still not recorded, and it does not clear the redo history either.",
      ],
      starter: `${EDITOR_UNDO.replace(
        "    return true;\n  }\n}\n",
        `    return true;
  }

  redo() {
    // Re-apply the most recently undone edit.
    return false;
  }
}
`,
      )}`,
      solution: EDITOR_REDO,
      tests: [
        {
          id: "redo",
          name: "Redo re-applies an undone edit",
          code: `${SAME}
const e = new Editor("hello");
e.apply({ type: "insert", at: 5, text: " world" });
e.undo();
same("text after undo", e.text, "hello");
same("redo()", e.redo(), true);
same("text after redo", e.text, "hello world");`,
        },
        {
          id: "alternate",
          name: "Undo twice, redo twice",
          code: `${SAME}
const e = new Editor("ab");
e.apply({ type: "insert", at: 2, text: "c" });
e.apply({ type: "delete", from: 0, to: 1 });
same("text after two edits", e.text, "bc");
e.undo();
e.undo();
same("text after two undos", e.text, "ab");
e.redo();
same("text after one redo", e.text, "abc");
e.redo();
same("text after two redos", e.text, "bc");
same("a third redo()", e.redo(), false);
e.undo();
same("text after undoing again", e.text, "abc");`,
        },
        {
          id: "nothing",
          name: "Nothing to redo",
          code: `${SAME}
const e = new Editor("abc");
same("redo() on a new editor", e.redo(), false);
e.apply({ type: "insert", at: 0, text: "x" });
same("redo() with nothing undone", e.redo(), false);
same("text", e.text, "xabc");`,
        },
        {
          id: "branch",
          name: "A new edit clears the redo history",
          code: `${SAME}
const e = new Editor("draft");
e.apply({ type: "insert", at: 5, text: " one" });
e.undo();
e.apply({ type: "insert", at: 5, text: " two" });
same("text", e.text, "draft two");
same("redo()", e.redo(), false);
same("text after a refused redo", e.text, "draft two");
e.undo();
same("text after undo", e.text, "draft");
same("a second undo()", e.undo(), false);`,
        },
        {
          id: "empty-edit",
          name: "An edit that changes nothing keeps the redo history",
          code: `${SAME}
const e = new Editor("abc");
e.apply({ type: "insert", at: 3, text: "d" });
e.undo();
e.apply({ type: "delete", from: 0, to: 0 });
same("redo()", e.redo(), true);
same("text after redo", e.text, "abcd");`,
        },
        {
          id: "redo-delete",
          name: "Redo a delete",
          code: `${SAME}
const e = new Editor("The quick brown fox");
e.apply({ type: "delete", from: 4, to: 10 });
e.undo();
e.redo();
same("text after redo", e.text, "The brown fox");
e.undo();
same("text after undoing the redo", e.text, "The quick brown fox");`,
        },
      ],
    },
  ],
);

// ─── Event emitter ───────────────────────────────────────────────────

const EMITTER_ON = `class Emitter {
  #listeners = new Map();

  on(event, listener) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(listener);
    return this;
  }

  emit(event, ...args) {
    const list = this.#listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const listener of [...list]) listener(...args);
    return true;
  }
}
`;

const EMITTER_OFF = `class Emitter {
  #listeners = new Map();

  on(event, listener) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(listener);
    return this;
  }

  emit(event, ...args) {
    const list = this.#listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const listener of [...list]) listener(...args);
    return true;
  }

  off(event, listener) {
    const list = this.#listeners.get(event);
    if (!list) return this;
    const at = list.lastIndexOf(listener);
    if (at !== -1) list.splice(at, 1);
    return this;
  }
}
`;

const EMITTER_ONCE = `class Emitter {
  #listeners = new Map();

  on(event, listener) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(listener);
    return this;
  }

  emit(event, ...args) {
    const list = this.#listeners.get(event);
    if (!list || list.length === 0) return false;
    for (const listener of [...list]) listener(...args);
    return true;
  }

  off(event, listener) {
    const list = this.#listeners.get(event);
    if (!list) return this;
    const at = list.findLastIndex((l) => l === listener || l.listener === listener);
    if (at !== -1) list.splice(at, 1);
    return this;
  }

  once(event, listener) {
    let fired = false;
    const wrapper = (...args) => {
      if (fired) return;
      fired = true;
      this.off(event, wrapper);
      listener(...args);
    };
    wrapper.listener = listener;
    return this.on(event, wrapper);
  }
}
`;

const LISTENER = "(...args: any[]) => void";

const EVENT_EMITTER = codeSteps(
  {
    slug: "event-emitter",
    title: "Event Emitter",
    difficulty: "Intermediate",
    topic: "Callbacks",
    language: "javascript",
    description:
      "Build a small publish-subscribe object: register listeners, remove them, and add one-shot listeners that really fire once.",
    solutionNote:
      "Everything hangs on `emit` working through a copy of the listener list, so a listener that adds or removes listeners, or emits again, cannot disturb the loop that called it. `once` then needs a guard of its own on top, a flag set and a removal made before the listener runs, because an emit that was already in progress still holds the wrapper in its copy.",
  },
  [
    {
      title: "Listen and emit",
      short: "Emit",
      solutionNote:
        "Looping over a copy, `[...list]`, is what makes the next-emit rule hold. A `for...of` over the live array picks up a listener pushed onto it mid-loop, so a listener that registers another one runs it in the same emit, and one that registers a fresh copy of itself never stops.",
      signature: `class Emitter {
  on(event: string, listener: ${LISTENER}): this
  emit(event: string, ...args: any[]): boolean
}`,
      prompt: [
        "Write an `Emitter` class. `on(event, listener)` registers a function for an event name and returns the emitter, so calls can chain. `emit(event, ...args)` calls every listener for that event, in the order they were registered, with the arguments it was given.",
        '`emit` returns `true` if the event had any listeners when it was called and `false` if it had none. Registering the same function twice means it runs twice. Events are independent: emitting `"save"` never calls a `"load"` listener.',
        "Listeners may register more listeners while an emit is running. The rule: changes take effect from the next emit, so a listener registered during an emit does not run in that same emit.",
      ],
      starter: `class Emitter {
  #listeners = new Map();

  on(event, listener) {
    // Keep one array of listeners per event name.
    return this;
  }

  emit(event, ...args) {
    return false;
  }
}
`,
      solution: EMITTER_ON,
      tests: [
        {
          id: "order-args",
          name: "Listeners run in order, with the arguments",
          code: `${SAME}
const e = new Emitter();
const log = [];
e.on("save", (name, size) => log.push("first " + name + " " + size));
e.on("save", (name) => log.push("second " + name));
e.emit("save", "notes.txt", 120);
same("calls", log, ["first notes.txt 120", "second notes.txt"]);`,
        },
        {
          id: "returns",
          name: "emit reports whether anyone was listening",
          code: `${SAME}
const e = new Emitter();
same("emit with no listeners", e.emit("save"), false);
e.on("save", () => {});
same("emit with a listener", e.emit("save"), true);
same("emit of another event", e.emit("load"), false);`,
        },
        {
          id: "chain",
          name: "on returns the emitter",
          code: `const e = new Emitter();
const log = [];
const got = e.on("a", () => log.push(1)).on("a", () => log.push(2));
if (got !== e) throw new Error("on should return the emitter itself");
e.emit("a");
if (log.join() !== "1,2") throw new Error("got " + JSON.stringify(log));`,
        },
        {
          id: "twice",
          name: "The same listener registered twice runs twice",
          code: `${SAME}
const e = new Emitter();
let calls = 0;
const bump = () => calls++;
e.on("tick", bump).on("tick", bump);
e.emit("tick");
same("calls", calls, 2);`,
        },
        {
          id: "independent",
          name: "Events are independent",
          code: `${SAME}
const e = new Emitter();
const log = [];
e.on("save", () => log.push("save"));
e.on("load", () => log.push("load"));
e.emit("load");
e.emit("load");
same("calls", log, ["load", "load"]);`,
        },
        {
          id: "added-during",
          name: "A listener added during an emit waits for the next one",
          code: `${SAME}
const e = new Emitter();
const log = [];
let added = false;
e.on("go", () => {
  log.push("a");
  if (!added) {
    added = true;
    e.on("go", () => log.push("b"));
  }
});
same("first emit", e.emit("go"), true);
same("calls after the first emit", log, ["a"]);
e.emit("go");
same("calls after the second emit", log, ["a", "a", "b"]);`,
        },
      ],
    },
    {
      title: "Remove a listener",
      short: "Off",
      solutionNote:
        "`lastIndexOf` plus one `splice` removes exactly the most recent registration and leaves the others in order, where `filter` would drop every copy. Because `emit` loops over a copy, the splice never shifts the array under a running loop; splicing the live array mid-loop is the classic bug where a listener that removes itself makes the next one silently skip.",
      signature: `class Emitter {
  // ...everything from step 1, plus:
  off(event: string, listener: ${LISTENER}): this
}`,
      prompt: [
        "Add `off(event, listener)`, which removes that function from the event and returns the emitter. If it was registered more than once, remove only the most recent registration; the earlier ones keep their place. Removing a function that is not registered does nothing.",
        "The next-emit rule covers removals too. A listener removed during an emit still runs in that emit if it had not been reached yet, and a listener that removes itself must not cause the one after it to be skipped.",
      ],
      starter: `${EMITTER_ON.replace(
        "    return true;\n  }\n}\n",
        `    return true;
  }

  off(event, listener) {
    // Remove the most recent registration of this listener, if there is one.
    return this;
  }
}
`,
      )}`,
      solution: EMITTER_OFF,
      tests: [
        {
          id: "off",
          name: "off removes a listener",
          code: `${SAME}
const e = new Emitter();
const log = [];
const a = () => log.push("a");
e.on("x", a).on("x", () => log.push("b"));
const got = e.off("x", a);
if (got !== e) throw new Error("off should return the emitter itself");
e.emit("x");
same("calls", log, ["b"]);`,
        },
        {
          id: "most-recent",
          name: "Only the most recent registration is removed",
          code: `${SAME}
const e = new Emitter();
const log = [];
const a = () => log.push("a");
e.on("x", a).on("x", () => log.push("b")).on("x", a);
e.off("x", a);
e.emit("x");
same("calls", log, ["a", "b"]);`,
        },
        {
          id: "unknown",
          name: "Removing something not registered does nothing",
          code: `${SAME}
const e = new Emitter();
const log = [];
e.off("nothing", () => {});
e.on("x", () => log.push("a"));
e.off("x", () => log.push("a"));
e.emit("x");
same("calls", log, ["a"]);`,
        },
        {
          id: "last-gone",
          name: "emit returns false once the last listener is gone",
          code: `${SAME}
const e = new Emitter();
const a = () => {};
e.on("x", a);
e.off("x", a);
same("emit", e.emit("x"), false);`,
        },
        {
          id: "self-removal",
          name: "A listener that removes itself does not skip the next",
          code: `${SAME}
const e = new Emitter();
const log = [];
const a = () => {
  log.push("a");
  e.off("x", a);
};
e.on("x", a).on("x", () => log.push("b"));
e.emit("x");
same("calls after the first emit", log, ["a", "b"]);
e.emit("x");
same("calls after the second emit", log, ["a", "b", "b"]);`,
        },
        {
          id: "removed-mid-emit",
          name: "A listener removed mid-emit still runs in that emit",
          code: `${SAME}
const e = new Emitter();
const log = [];
const b = () => log.push("b");
e.on("x", () => {
  log.push("a");
  e.off("x", b);
}).on("x", b);
e.emit("x");
same("calls after the first emit", log, ["a", "b"]);
e.emit("x");
same("calls after the second emit", log, ["a", "b", "a"]);`,
        },
      ],
    },
    {
      title: "Listen once",
      short: "Once",
      solutionNote:
        "Wrap the listener in a function that sets a `fired` flag and calls `off` on itself before calling the original. The removal is what a nested emit sees; the flag is what the outer emit's copy of the list sees, since that copy still holds the wrapper. Hanging the original on the wrapper (`wrapper.listener = listener`) is how `off` recognises it.",
      signature: `class Emitter {
  // ...everything from step 2, plus:
  once(event: string, listener: ${LISTENER}): this
}`,
      prompt: [
        "Add `once(event, listener)`: the listener runs on the next emit of that event, then is removed. It takes its place in the order like any other registration, and `off(event, listener)` with the original function removes it if it has not fired yet.",
        "A once listener runs at most once, even when emits nest. If it emits the same event from inside itself, that inner emit must not call it again (and returns `false` when nothing else is listening). And if an earlier listener's nested emit fires it first, the outer emit that was already running must not call it a second time.",
      ],
      starter: `${EMITTER_OFF.replace(
        "    return this;\n  }\n}\n",
        `    return this;
  }

  once(event, listener) {
    // Wrap the listener so it removes itself before it runs, and runs only once.
    return this.on(event, listener);
  }
}
`,
      )}`,
      solution: EMITTER_ONCE,
      tests: [
        {
          id: "once",
          name: "A once listener runs once",
          code: `${SAME}
const e = new Emitter();
const log = [];
e.once("ready", (who) => log.push(who));
same("first emit", e.emit("ready", "db"), true);
same("second emit", e.emit("ready", "cache"), false);
same("calls", log, ["db"]);`,
        },
        {
          id: "order",
          name: "It keeps its place in the order",
          code: `${SAME}
const e = new Emitter();
const log = [];
e.on("x", () => log.push("a"));
e.once("x", () => log.push("b"));
e.on("x", () => log.push("c"));
e.emit("x");
e.emit("x");
same("calls", log, ["a", "b", "c", "a", "c"]);`,
        },
        {
          id: "off-once",
          name: "off with the original function removes it",
          code: `${SAME}
const e = new Emitter();
let calls = 0;
const f = () => calls++;
e.once("x", f);
e.off("x", f);
same("emit", e.emit("x"), false);
same("calls", calls, 0);`,
        },
        {
          id: "self-reentrant",
          name: "Emitting from inside itself",
          description: "The nested emit must not call it again, and finds nobody listening.",
          code: `${SAME}
const e = new Emitter();
let calls = 0;
let inner = null;
e.once("tick", () => {
  calls++;
  inner = e.emit("tick");
});
e.emit("tick");
same("calls", calls, 1);
same("the nested emit returned", inner, false);`,
        },
        {
          id: "outer-emit",
          name: "An emit already in progress does not call it twice",
          description: "An earlier listener's nested emit fires it first.",
          code: `${SAME}
const e = new Emitter();
const log = [];
let nested = false;
e.on("go", () => {
  log.push("a");
  if (!nested) {
    nested = true;
    e.emit("go");
  }
});
e.once("go", () => log.push("b"));
e.emit("go");
same("calls after the first emit", log, ["a", "a", "b"]);
e.emit("go");
same("calls after the second emit", log, ["a", "a", "b", "a"]);`,
        },
        {
          id: "earlier-steps",
          name: "on and off still work",
          code: `${SAME}
const e = new Emitter();
const log = [];
const a = () => log.push("a");
e.on("x", a).on("x", () => log.push("b")).on("x", a);
e.off("x", a);
e.emit("x");
same("calls", log, ["a", "b"]);`,
        },
      ],
    },
  ],
);

// ─── Line diff ───────────────────────────────────────────────────────

const LCS = `function lcsTable(a, b) {
  // table[i][j] is the LCS length of a.slice(i) and b.slice(j).
  const table = Array.from({ length: a.length + 1 }, () => new Int32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

function lcsLength(a, b) {
  return lcsTable(a, b)[0][0];
}
`;

const DIFF = `${LCS}
function diffLines(a, b) {
  const table = lcsTable(a, b);
  const out = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push([" ", a[i]]);
      i++;
      j++;
    } else if (j === b.length || (i < a.length && table[i + 1][j] >= table[i][j + 1])) {
      out.push(["-", a[i]]);
      i++;
    } else {
      out.push(["+", b[j]]);
      j++;
    }
  }
  return out;
}
`;

/**
 * Checks a diff by its properties rather than against one expected list,
 * because two files can have more than one minimal diff and the prompt
 * accepts any of them.
 */
const CHECK_DIFF = `const checkDiff = (a, b, diff, keep) => {
  if (!Array.isArray(diff)) throw new Error("expected an array, got " + JSON.stringify(diff));
  for (const entry of diff) {
    if (!Array.isArray(entry) || entry.length !== 2 || ![" ", "-", "+"].includes(entry[0])) {
      throw new Error("not an [op, line] pair: " + JSON.stringify(entry));
    }
  }
  const side = (skip) => diff.filter(([op]) => op !== skip).map(([, line]) => line);
  if (JSON.stringify(side("+")) !== JSON.stringify(a)) {
    throw new Error("the kept and removed lines do not rebuild a");
  }
  if (JSON.stringify(side("-")) !== JSON.stringify(b)) {
    throw new Error("the kept and added lines do not rebuild b");
  }
  const kept = diff.filter(([op]) => op === " ").length;
  if (kept !== keep) {
    throw new Error("kept " + kept + " lines, but the two files share " + keep);
  }
  for (let k = 1; k < diff.length; k++) {
    if (diff[k - 1][0] === "+" && diff[k][0] === "-") {
      throw new Error("an addition comes before a removal at entry " + k);
    }
  }
};`;

const BIG_A = 'Array.from({ length: 2000 }, (_, i) => "line " + i)';
const BIG_B = 'Array.from({ length: 2000 }, (_, i) => (i % 10 === 0 ? "changed " + i : "line " + i))';

const CONFIG_A = [
  "[server]",
  "host = 0.0.0.0",
  "port = 8080",
  "workers = 4",
  "timeout = 30",
  "log_level = info",
  "",
  "[database]",
  "url = postgres://db/app",
  "pool = 10",
  "retries = 3",
];
const CONFIG_B = CONFIG_A.map((line) =>
  line === "port = 8080" ? "port = 9090" : line === "pool = 10" ? "pool = 20" : line,
);
const CONFIG_ARGS = `${JSON.stringify(CONFIG_A)}, ${JSON.stringify(CONFIG_B)}`;

const LINE_DIFF = codeSteps(
  {
    slug: "line-diff",
    title: "Line Diff",
    difficulty: "Advanced",
    topic: "Longest common subsequence",
    language: "javascript",
    description:
      "Compare two versions of a file line by line: measure what they share, list the edits, then print a compact diff.",
    solutionNote:
      "One table does all the work: `table[i][j]` holds the LCS length of the remainders `a.slice(i)` and `b.slice(j)`, filled from the back in O(n·m). Walking it from the front turns lengths into edits, keeping a line whenever the two agree and otherwise stepping whichever way loses nothing, so the diff comes out minimal without any search.",
  },
  [
    {
      title: "Measure what is shared",
      short: "LCS",
      solutionNote:
        "Each cell looks at one pair of lines: if `a[i]` equals `b[j]` the pair extends the answer for both remainders, `table[i + 1][j + 1] + 1`, and otherwise the best is the larger of dropping a line from either side, `table[i + 1][j]` or `table[i][j + 1]`. That is O(n·m), about four million cells for 2,000 lines a side, where recursion without the table solves the same subproblems over and over, exponentially.",
      signature: "function lcsLength(a: string[], b: string[]): number",
      prompt: [
        'Two versions of a file arrive as arrays of lines. Return the length of their longest common subsequence: the most lines you can pick from both, in the same order, without the picks having to be next to each other. `["a", "b", "c", "d"]` and `["a", "c", "d", "e"]` share `a`, `c` and `d`, so the answer is `3`.',
        "Files run to a few thousand lines, so trying every subsequence is out; fill a table instead. Build it in a helper of its own, with `table[i][j]` as the answer for `a.slice(i)` and `b.slice(j)`, filled from the bottom-right corner: step 2 walks the same table.",
      ],
      starter: `function lcsLength(a, b) {
  // table[i][j]: the answer for a.slice(i) and b.slice(j), filled from the back.
  return 0;
}
`,
      solution: LCS,
      tests: jsCases("lcsLength", [
        {
          id: "basic",
          name: "Three lines in common",
          args: [["a", "b", "c", "d"], ["a", "c", "d", "e"]],
          expected: 3,
        },
        {
          id: "identical",
          name: "Identical files",
          args: [["x", "y", "z", "w"], ["x", "y", "z", "w"]],
          expected: 4,
        },
        {
          id: "disjoint",
          name: "Nothing in common",
          args: [["a", "b"], ["c", "d", "e"]],
          expected: 0,
        },
        { id: "empty", name: "An empty file", args: [[], ["a", "b"]], expected: 0 },
        {
          id: "order",
          name: "Order matters",
          description: "The same lines reversed share only one line in order.",
          args: [["a", "b", "c"], ["c", "b", "a"]],
          expected: 1,
        },
        {
          id: "repeats",
          name: "Repeated lines",
          args: [["}", "x", "}", "}"], ["}", "}", "y", "}"]],
          expected: 3,
        },
        {
          id: "large",
          name: "Two thousand lines a side",
          description: "A recursive search without a table cannot finish on files this size.",
          jsArgs: `${BIG_A}, ${BIG_B}`,
          expected: 1800,
        },
      ]),
    },
    {
      title: "List the edits",
      short: "Diff",
      solutionNote:
        "When `a[i]` equals `b[j]`, keeping the pair is always part of some longest subsequence, so the walk never has to look ahead; when they differ, the table says which side can give up a line without shrinking what is left to share. Breaking ties toward removal is also what orders each block: the walk adds a line only while the current line of `a` is still needed, and it stays needed until it is kept, so no removal can follow an addition. Break ties the other way and additions come first.",
      signature: 'function diffLines(a: string[], b: string[]): [" " | "-" | "+", string][]',
      prompt: [
        'Turn the table into a diff: a list of `[op, line]` pairs where `" "` keeps a line both versions share, `"-"` removes a line of `a` and `"+"` adds a line of `b`. Reading the kept and removed lines in order gives back `a`; reading the kept and added lines gives back `b`.',
        "The diff must be minimal: it keeps exactly as many lines as the longest common subsequence. Walk the table from `(0, 0)`: when the current lines are equal, keep the line; otherwise remove from `a` if `table[i + 1][j] >= table[i][j + 1]` (that loses nothing), else add from `b`. Some pairs of files have more than one minimal diff, and any of them passes.",
        'Within each run of changes, list every removal before any addition, the way `git diff` prints a changed block: `["-", "old"]` then `["+", "new"]`, never the other way round.',
      ],
      starter: `${LCS}
function diffLines(a, b) {
  const table = lcsTable(a, b);
  const out = [];
  // Walk from (0, 0): keep equal lines, else step the way the table says loses nothing.
  return out;
}
`,
      solution: DIFF,
      tests: [
        {
          id: "one-line",
          name: "One changed line",
          code: `const got = diffLines(["a", "b", "c"], ["a", "x", "c"]);
const want = [[" ", "a"], ["-", "b"], ["+", "x"], [" ", "c"]];
if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "block",
          name: "A changed block lists removals first",
          code: `const got = diffLines(["a", "b", "c", "d"], ["a", "x", "y", "d"]);
const want = [[" ", "a"], ["-", "b"], ["-", "c"], ["+", "x"], ["+", "y"], [" ", "d"]];
if (JSON.stringify(got) !== JSON.stringify(want)) throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "identical",
          name: "Identical files keep every line",
          code: `const got = diffLines(["x", "y"], ["x", "y"]);
if (JSON.stringify(got) !== JSON.stringify([[" ", "x"], [" ", "y"]])) throw new Error("got " + JSON.stringify(got));`,
        },
        {
          id: "empty",
          name: "Against an empty file",
          code: `const added = diffLines([], ["x", "y"]);
if (JSON.stringify(added) !== JSON.stringify([["+", "x"], ["+", "y"]])) throw new Error("got " + JSON.stringify(added));
const removed = diffLines(["x"], []);
if (JSON.stringify(removed) !== JSON.stringify([["-", "x"]])) throw new Error("got " + JSON.stringify(removed));
const none = diffLines([], []);
if (JSON.stringify(none) !== "[]") throw new Error("got " + JSON.stringify(none));`,
        },
        {
          id: "code",
          name: "Source code with repeated lines",
          description: "Closing braces and blank lines appear more than once, so there are three equally short diffs; any of them passes.",
          code: `${CHECK_DIFF}
const a = ["import { load } from './io.js';", "", "function parse(text) {", "  return text.trim();", "}", "", "function main() {", "  return parse(load());", "}"];
const b = ["import { load } from './io.js';", "", "function main() {", "  return load();", "}", ""];
checkDiff(a, b, diffLines(a, b), 4);`,
        },
        {
          id: "large",
          name: "Two thousand lines a side",
          code: `${CHECK_DIFF}
const a = ${BIG_A};
const b = ${BIG_B};
checkDiff(a, b, diffLines(a, b), 1800);`,
        },
        {
          id: "lcs-survives",
          name: "lcsLength still works",
          code: `const got = lcsLength(["a", "b", "c", "d"], ["a", "c", "d", "e"]);
if (got !== 3) throw new Error("got " + got);`,
        },
      ],
    },
    {
      title: "Print a compact diff",
      short: "Render",
      solutionNote:
        "Handling one stretch of kept lines at a time reduces the edge cases to two numbers: how many lines the stretch keeps at its head (`context` if a change comes before it, else 0) and at its tail (`context` if a change follows). Collapsing only when the stretch is longer than head plus tail is what prints a short gap between two changes in full instead of a marker that hides nothing.",
      signature: "function renderDiff(a: string[], b: string[], context: number): string",
      prompt: [
        'Render the diff as text, one line per entry: the op character followed directly by the line, so a kept `workers = 4` prints as `" workers = 4"` and a removed one as `"-workers = 4"`. Join the lines with `"\\n"`, with no newline at the end.',
        "Long stretches of unchanged lines are noise. Keep only `context` unchanged lines next to each change, and replace the rest of the stretch with a single `@@ n unchanged @@` line, where `n` counts the lines hidden. A stretch between two changes keeps `context` lines at each end; a stretch at the start of the file keeps only its last `context` lines, and one at the end only its first.",
        'Collapse a stretch only when that hides at least one line. A file with no changes at all is one stretch with no change beside it, so it renders as a single `@@ n unchanged @@` line, and two empty files render as `""`.',
      ],
      starter: `${DIFF}
function renderDiff(a, b, context) {
  // Print each entry as its op plus the line, then collapse long unchanged stretches.
  return diffLines(a, b).map(([op, line]) => op + line).join("\\n");
}
`,
      solution: `${DIFF}
function renderDiff(a, b, context) {
  const entries = diffLines(a, b);
  const lines = [];
  let k = 0;
  while (k < entries.length) {
    if (entries[k][0] !== " ") {
      lines.push(entries[k][0] + entries[k][1]);
      k++;
      continue;
    }
    let end = k;
    while (end < entries.length && entries[end][0] === " ") end++;
    const run = entries.slice(k, end).map(([, line]) => " " + line);
    const head = k > 0 ? context : 0;
    const tail = end < entries.length ? context : 0;
    if (run.length > head + tail) {
      lines.push(
        ...run.slice(0, head),
        "@@ " + (run.length - head - tail) + " unchanged @@",
        ...run.slice(run.length - tail),
      );
    } else {
      lines.push(...run);
    }
    k = end;
  }
  return lines.join("\\n");
}
`,
      tests: jsCases("renderDiff", [
        {
          id: "context-1",
          name: "Two changes with one line of context",
          jsArgs: `${CONFIG_ARGS}, 1`,
          expected: [
            "@@ 1 unchanged @@",
            " host = 0.0.0.0",
            "-port = 8080",
            "+port = 9090",
            " workers = 4",
            "@@ 4 unchanged @@",
            " url = postgres://db/app",
            "-pool = 10",
            "+pool = 20",
            " retries = 3",
          ].join("\n"),
        },
        {
          id: "context-0",
          name: "No context at all",
          jsArgs: `${CONFIG_ARGS}, 0`,
          expected: [
            "@@ 2 unchanged @@",
            "-port = 8080",
            "+port = 9090",
            "@@ 6 unchanged @@",
            "-pool = 10",
            "+pool = 20",
            "@@ 1 unchanged @@",
          ].join("\n"),
        },
        {
          id: "short-gap",
          name: "A short gap between changes is printed in full",
          args: [["a", "b", "c", "d", "e", "f", "g"], ["a", "B", "c", "d", "e", "F", "g"], 2],
          expected: [" a", "-b", "+B", " c", " d", " e", "-f", "+F", " g"].join("\n"),
        },
        {
          id: "edges",
          name: "Changes on the first and last lines",
          args: [
            ["one", "two", "three", "four", "five", "six"],
            ["zero", "two", "three", "four", "five", "seven"],
            1,
          ],
          expected: ["-one", "+zero", " two", "@@ 2 unchanged @@", " five", "-six", "+seven"].join("\n"),
        },
        {
          id: "unchanged",
          name: "A file with no changes",
          jsArgs: `${JSON.stringify(CONFIG_A)}, ${JSON.stringify(CONFIG_A)}, 3`,
          expected: "@@ 11 unchanged @@",
        },
        { id: "both-empty", name: "Two empty files", args: [[], [], 3], expected: "" },
        {
          id: "new-file",
          name: "A brand new file",
          args: [[], ["x", "y"], 3],
          expected: "+x\n+y",
        },
      ]),
    },
  ],
);

// ─── Cron schedule ───────────────────────────────────────────────────

const PARSE_FIELD = `function parseField(field, min, max) {
  const values = new Set();
  for (const part of field.split(",")) {
    const m = /^(?:(\\*)|(\\d+)(?:-(\\d+))?)(?:\\/(\\d+))?$/.exec(part);
    if (!m) throw new Error("cannot read " + JSON.stringify(part));
    const [, star, start, end, stepText] = m;
    if (stepText !== undefined && !star && end === undefined) {
      throw new Error("a step needs * or a range: " + JSON.stringify(part));
    }
    const lo = star ? min : Number(start);
    const hi = star ? max : end !== undefined ? Number(end) : lo;
    const step = stepText !== undefined ? Number(stepText) : 1;
    if (lo < min || hi > max || lo > hi) {
      throw new RangeError(JSON.stringify(part) + " is outside " + min + "-" + max);
    }
    if (step < 1) throw new RangeError("a step must be at least 1: " + JSON.stringify(part));
    for (let v = lo; v <= hi; v += step) values.add(v);
  }
  return [...values].sort((x, y) => x - y);
}
`;

const PARSE_CRON = `${PARSE_FIELD}
function parseCron(expr) {
  const fields = expr.trim().split(/\\s+/);
  if (fields.length !== 3) {
    throw new Error("expected minute, hour and day of week, got " + JSON.stringify(expr));
  }
  const [minute, hour, weekday] = fields;
  return {
    minutes: parseField(minute, 0, 59),
    hours: parseField(hour, 0, 23),
    weekdays: parseField(weekday, 0, 6),
  };
}
`;

const CRON_SCHEDULE = codeSteps(
  {
    slug: "cron-schedule",
    title: "Cron Schedule",
    difficulty: "Advanced",
    topic: "Parsing and search",
    language: "javascript",
    description:
      "Parse a cron-style schedule into the minutes, hours and weekdays it allows, then work out when it next fires.",
    solutionNote:
      "Parsing each field into an explicit sorted list of allowed values turns the schedule into three membership tests, so finding the next run is a search forward in time that skips a whole day when the weekday is wrong and a whole hour when the hour is. Doing that search in UTC milliseconds with `Date.UTC` is what makes month ends, leap days and new year free, and keeps the answer from shifting with the machine's time zone.",
  },
  [
    {
      title: "Parse one field",
      short: "Field",
      solutionNote:
        "One regular expression per part splits it into a start, an end and a step, so `*`, a single number and a range all become the same loop from `lo` to `hi`. A `Set` absorbs overlapping parts, and the comparator in `sort((x, y) => x - y)` matters: the default `sort()` compares as text and puts `10` before `5`.",
      signature: "function parseField(field: string, min: number, max: number): number[]",
      prompt: [
        "A cron field says which values of one unit are allowed. Given the unit's bounds (`0` to `59` for minutes, say), return them as a sorted array with no duplicates.",
        "A field is a comma-separated list of parts. A part is `*` for every value from `min` to `max`, a number like `5`, or an inclusive range like `1-5`. `*` or a range can be followed by a step: `*/15` is every fifteenth value starting at `min`, and `10-30/5` is 10, 15, 20, 25 and 30. Parts may overlap, so `45,5-7,6,10` is `[5, 6, 7, 10, 45]`.",
        "Throw an `Error` for anything else: a value outside the bounds, a range that runs backwards like `5-1`, a step of `0`, a step after a single number like `5/15`, an empty part, or text that is not a number.",
      ],
      starter: `function parseField(field, min, max) {
  const values = new Set();
  for (const part of field.split(",")) {
    // A part is *, a number or a range, optionally followed by /step.
  }
  return [...values];
}
`,
      solution: PARSE_FIELD,
      tests: [
        ...jsCases("parseField", [
          { id: "star", name: "A star covers the whole range", args: ["*", 0, 6], expected: [0, 1, 2, 3, 4, 5, 6] },
          { id: "single", name: "A single value", args: ["5", 0, 59], expected: [5] },
          { id: "range", name: "A range includes both ends", args: ["1-5", 0, 6], expected: [1, 2, 3, 4, 5] },
          {
            id: "star-step",
            name: "A stepped star starts at the minimum",
            args: ["*/15", 0, 59],
            expected: [0, 15, 30, 45],
          },
          {
            id: "range-step",
            name: "A stepped range",
            args: ["10-30/5", 0, 59],
            expected: [10, 15, 20, 25, 30],
          },
          {
            id: "overlap",
            name: "Overlapping parts, sorted as numbers",
            description: "Sorting as text would put 10 and 45 before 5.",
            args: ["45,5-7,6,10", 0, 59],
            expected: [5, 6, 7, 10, 45],
          },
        ]),
        {
          id: "invalid",
          name: "Malformed fields throw",
          description: "Out of bounds, a backwards range, a zero step, a step on a single number, an empty part, and text.",
          code: `const bad = [["60", 0, 59], ["7", 0, 6], ["5-1", 0, 59], ["*/0", 0, 59], ["5/15", 0, 59], ["1,,2", 0, 59], ["", 0, 59], ["x", 0, 59]];
for (const [field, min, max] of bad) {
  let threw = false;
  try { parseField(field, min, max); } catch { threw = true; }
  if (!threw) throw new Error("parseField(" + JSON.stringify(field) + ", " + min + ", " + max + ") should throw");
}`,
        },
      ],
    },
    {
      title: "Parse a schedule",
      short: "Schedule",
      solutionNote:
        "Splitting on `/\\s+/` after a `trim()` is what makes repeated and surrounding spaces harmless; `split(\" \")` produces empty fields and then counts them. The bounds live here and nowhere else, so `parseField` stays a general tool and an hour of `24` fails for exactly the reason a minute of `60` does.",
      signature:
        "function parseCron(expr: string): { minutes: number[], hours: number[], weekdays: number[] }",
      prompt: [
        'A schedule has three fields separated by whitespace: minute (`0` to `59`), hour (`0` to `23`) and day of the week (`0` to `6`, where `0` is Sunday). `"*/15 9-17 1-5"` means every quarter hour from 09:00 to 17:45 on weekdays.',
        "Return `{ minutes, hours, weekdays }`, each parsed with `parseField` and its own bounds. Extra spaces between or around the fields are fine. Any other number of fields is an error, and so is a value outside its field's bounds, such as an hour of `24` or a weekday of `7`.",
      ],
      starter: `${PARSE_FIELD}
function parseCron(expr) {
  // Three whitespace-separated fields, each with its own bounds.
  return { minutes: [], hours: [], weekdays: [] };
}
`,
      solution: PARSE_CRON,
      tests: jsCases("parseCron", [
        {
          id: "workday",
          name: "Every quarter hour in working hours",
          args: ["*/15 9-17 1-5"],
          expected: {
            minutes: [0, 15, 30, 45],
            hours: [9, 10, 11, 12, 13, 14, 15, 16, 17],
            weekdays: [1, 2, 3, 4, 5],
          },
        },
        {
          id: "all",
          name: "Three stars allow everything",
          args: ["* * *"],
          jsExpected:
            "{ minutes: Array.from({ length: 60 }, (_, i) => i), hours: Array.from({ length: 24 }, (_, i) => i), weekdays: [0, 1, 2, 3, 4, 5, 6] }",
        },
        {
          id: "spaces",
          name: "Extra spaces are fine",
          args: ["  0   12  *  "],
          expected: { minutes: [0], hours: [12], weekdays: [0, 1, 2, 3, 4, 5, 6] },
        },
        {
          id: "weekend",
          name: "Lists in the hour and weekday",
          args: ["0 8,18 0,6"],
          expected: { minutes: [0], hours: [8, 18], weekdays: [0, 6] },
        },
        { id: "two-fields", name: "Two fields is an error", args: ["0 12"], throws: true },
        { id: "four-fields", name: "Four fields is an error", args: ["0 12 * *"], throws: true },
        { id: "hour-24", name: "An hour of 24 is out of bounds", args: ["0 24 *"], throws: true },
        { id: "weekday-7", name: "A weekday of 7 is out of bounds", args: ["0 12 7"], throws: true },
      ]),
    },
    {
      title: "Find the next run",
      short: "Next run",
      solutionNote:
        "`Date.UTC` normalises overflow, so `Date.UTC(y, m, d + 1)` is midnight tomorrow even on 31 December or 28 February of a leap year; that is what lets the search jump a day or an hour with no calendar arithmetic of its own. Starting one minute after the given time is the whole of \"strictly after\", and `toISOString().slice(0, 16)` gives back the zero-padded format.",
      signature: "function nextRun(expr: string, after: string): string",
      prompt: [
        'Given a schedule and a time written `"YYYY-MM-DD HH:MM"`, return the first minute strictly after it that the schedule allows, in the same format. A schedule that fires at 09:00, asked at exactly 09:00, answers with 09:00 on the next day it allows.',
        'Times are UTC. Build them with `Date.UTC` and read them back with `getUTCDay`, `getUTCHours` and friends: `new Date("2026-09-24 14:05")` reads the text in the machine\'s local zone, and a daylight-saving change then adds or loses an hour. Every valid schedule fires at least once a week, so the answer is never more than seven days away.',
        "Checking every minute of the week is allowed but wasteful: when the weekday is not allowed, jump to midnight of the next day, and when the hour is not allowed, jump to the start of the next hour.",
      ],
      starter: `${PARSE_CRON}
function nextRun(expr, after) {
  const { minutes, hours, weekdays } = parseCron(expr);
  // Parse "YYYY-MM-DD HH:MM" as UTC, start one minute later, and search forward.
  return after;
}
`,
      solution: `${PARSE_CRON}
const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function nextRun(expr, after) {
  const { minutes, hours, weekdays } = parseCron(expr);
  const m = /^(\\d{4})-(\\d{2})-(\\d{2}) (\\d{2}):(\\d{2})$/.exec(after);
  if (!m) throw new Error("expected YYYY-MM-DD HH:MM, got " + JSON.stringify(after));
  const [year, month, day, hour, minute] = m.slice(1).map(Number);
  let t = Date.UTC(year, month - 1, day, hour, minute) + MINUTE;
  const limit = t + 8 * DAY;
  while (t < limit) {
    const at = new Date(t);
    if (!weekdays.includes(at.getUTCDay())) {
      t = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate() + 1);
    } else if (!hours.includes(at.getUTCHours())) {
      t = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate(), at.getUTCHours() + 1);
    } else if (!minutes.includes(at.getUTCMinutes())) {
      t += MINUTE;
    } else {
      return at.toISOString().slice(0, 16).replace("T", " ");
    }
  }
  return null;
}
`,
      tests: jsCases("nextRun", [
        {
          id: "quarter",
          name: "The next quarter hour",
          args: ["*/15 * *", "2026-09-24 14:05"],
          expected: "2026-09-24 14:15",
        },
        {
          id: "strictly-after",
          name: "Strictly after the given time",
          description: "Asked at 09:00, a 09:00 schedule answers with tomorrow.",
          args: ["0 9 *", "2026-09-24 09:00"],
          expected: "2026-09-25 09:00",
        },
        {
          id: "weekend",
          name: "A weekday schedule skips the weekend",
          description: "25 September 2026 is a Friday.",
          args: ["30 8 1-5", "2026-09-25 09:00"],
          expected: "2026-09-28 08:30",
        },
        {
          id: "week",
          name: "A whole week ahead",
          description: "A Thursday-only schedule, asked on Thursday just as it fires.",
          args: ["0 9 4", "2026-09-24 09:00"],
          expected: "2026-10-01 09:00",
        },
        {
          id: "new-year",
          name: "Across the new year",
          args: ["0 0 *", "2026-12-31 23:59"],
          expected: "2027-01-01 00:00",
        },
        {
          id: "leap-day",
          name: "Onto a leap day",
          args: ["0 12 *", "2028-02-28 13:00"],
          expected: "2028-02-29 12:00",
        },
        {
          id: "sunday",
          name: "Sunday is day 0",
          description: "26 September 2026 is a Saturday.",
          args: ["0 10 0", "2026-09-26 11:00"],
          expected: "2026-09-27 10:00",
        },
        {
          id: "bad-expr",
          name: "An invalid schedule throws",
          args: ["0 24 *", "2026-09-24 09:00"],
          throws: true,
        },
      ]),
    },
  ],
);

// ─── Quoted CSV ──────────────────────────────────────────────────────

const CSV_SPLIT = `function parseCsv(text) {
  if (text === "") return [];
  return text
    .replace(/\\r?\\n$/, "")
    .split(/\\r?\\n/)
    .map((line) => line.split(","));
}
`;

const CSV_QUOTED = `function parseLine(line) {
  const fields = [];
  let field = "";
  let state = "start"; // start, plain, quoted or closed
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (state === "quoted") {
      if (ch !== '"') field += ch;
      else if (line[i + 1] === '"') {
        field += '"';
        i++;
      } else state = "closed";
    } else if (ch === ",") {
      fields.push(field);
      field = "";
      state = "start";
    } else if (state === "closed") {
      throw new Error("unexpected " + JSON.stringify(ch) + " after a closing quote");
    } else if (ch === '"' && state === "start") {
      state = "quoted";
    } else {
      field += ch;
      state = "plain";
    }
  }
  if (state === "quoted") throw new Error("a quoted field never closes");
  fields.push(field);
  return fields;
}

function parseCsv(text) {
  if (text === "") return [];
  return text.replace(/\\r?\\n$/, "").split(/\\r?\\n/).map(parseLine);
}
`;

const CSV_RECORDS = `function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let state = "start"; // start, plain, quoted or closed
  const endField = () => {
    row.push(field);
    field = "";
    state = "start";
  };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const lineBreak = ch === "\\n" ? 1 : ch === "\\r" && text[i + 1] === "\\n" ? 2 : 0;
    if (state === "quoted") {
      if (ch !== '"') field += ch;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else state = "closed";
    } else if (ch === ",") {
      endField();
    } else if (lineBreak) {
      endField();
      rows.push(row);
      row = [];
      i += lineBreak - 1;
    } else if (state === "closed") {
      throw new Error("unexpected " + JSON.stringify(ch) + " after a closing quote");
    } else if (ch === '"' && state === "start") {
      state = "quoted";
    } else {
      field += ch;
      state = "plain";
    }
  }
  if (state === "quoted") throw new Error("a quoted field never closes");
  if (state !== "start" || row.length > 0) {
    endField();
    rows.push(row);
  }
  return rows;
}

function toRecords(text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows.map((row, n) => {
    if (row.length !== header.length) {
      throw new Error("row " + (n + 2) + ": expected " + header.length + " fields, got " + row.length);
    }
    return Object.fromEntries(header.map((name, k) => [name, row[k]]));
  });
}
`;

const CSV_QUOTED_FIELDS = codeSteps(
  {
    slug: "csv-quoted-fields",
    title: "Quoted CSV Parser",
    difficulty: "Intermediate",
    topic: "State machines",
    language: "javascript",
    description:
      "Parse CSV the way spreadsheets write it: plain fields first, then quoted fields holding commas, escaped quotes and line breaks.",
    solutionNote:
      "A quote changes the meaning of every character after it until the closing quote, and no split on commas or line breaks can know that. So the finished parser reads one character at a time and carries a state (at the start of a field, in a plain field, inside quotes, or just after a closing quote), and every rule of the format is one transition between those four.",
  },
  [
    {
      title: "Split rows and fields",
      short: "Split",
      solutionNote:
        'Stripping one trailing line break before splitting is what stops the newline that almost every file ends with from becoming a phantom row holding one empty field. Splitting on `/\\r?\\n/` rather than `"\\n"` handles Windows files without leaving a `"\\r"` stuck to the last field of every row.',
      signature: "function parseCsv(text: string): string[][]",
      prompt: [
        'Parse CSV text into rows of fields. Rows are separated by line breaks, either `"\\n"` or `"\\r\\n"` (files saved on Windows use the second), and fields by commas. Every field is a string: `"sku,qty\\nbolt,40"` becomes `[["sku", "qty"], ["bolt", "40"]]`.',
        'Empty fields are kept: `"a,,c"` has three fields, a trailing comma makes a trailing empty field, and a blank line in the middle is a row holding one empty field. A single line break at the very end of the text does not start another row, and an empty text has no rows at all. No quoting yet; that is step 2.',
      ],
      starter: `function parseCsv(text) {
  // Split into lines (a line break is \\n or \\r\\n), then each line on commas.
  return [];
}
`,
      solution: CSV_SPLIT,
      tests: jsCases("parseCsv", [
        {
          id: "basic",
          name: "Three rows ending in a line break",
          args: ["name,qty\nbolt,40\nnut,120\n"],
          expected: [["name", "qty"], ["bolt", "40"], ["nut", "120"]],
        },
        {
          id: "crlf",
          name: "Windows line breaks",
          args: ["a,b\r\nc,d"],
          expected: [["a", "b"], ["c", "d"]],
        },
        {
          id: "empty-fields",
          name: "Empty fields are kept",
          args: ["a,,c\n,,"],
          expected: [["a", "", "c"], ["", "", ""]],
        },
        { id: "trailing-comma", name: "A trailing comma", args: ["a,\n"], expected: [["a", ""]] },
        {
          id: "blank-line",
          name: "A blank line in the middle",
          args: ["a\n\nb"],
          expected: [["a"], [""], ["b"]],
        },
        { id: "one-row", name: "One row with no line break", args: ["sku,qty"], expected: [["sku", "qty"]] },
        { id: "empty", name: "An empty text has no rows", args: [""], expected: [] },
      ]),
    },
    {
      title: "Quoted fields",
      short: "Quotes",
      solutionNote:
        'Once a quote can hide a comma, splitting is over: the line is read one character at a time with a small state (at the start of a field, in a plain field, in a quoted field, or just after a closing quote). The doubled quote is the one place that looks ahead: inside quotes, a `"` followed by another `"` is a literal quote, and a `"` followed by anything else closes the field.',
      signature: "function parseCsv(text: string): string[][]",
      prompt: [
        'A field that holds a comma is wrapped in double quotes: `P-1,"hinge, brass",40` has three fields, the middle one `hinge, brass`. Inside quotes, two quotes in a row stand for one quote character, so `"say ""hi"""` is the field `say "hi"`. The wrapping quotes are not part of the value, and `""` on its own is an empty field.',
        'A quote only opens a quoted field when it is the field\'s first character; anywhere else in an unquoted field it is an ordinary character, as in `12" steel`. After a closing quote the field must end, so anything but a comma or the end of the line is an error, and so is a quote that never closes. Quoted fields do not contain line breaks yet.',
      ],
      starter: `function parseLine(line) {
  // Read one character at a time: a quote at the start of a field hides commas until it closes.
  return line.split(",");
}

function parseCsv(text) {
  if (text === "") return [];
  return text.replace(/\\r?\\n$/, "").split(/\\r?\\n/).map(parseLine);
}
`,
      solution: CSV_QUOTED,
      tests: jsCases("parseCsv", [
        {
          id: "comma",
          name: "A comma inside quotes",
          args: ['sku,note,qty\nP-1,"hinge, brass",40\n'],
          expected: [["sku", "note", "qty"], ["P-1", "hinge, brass", "40"]],
        },
        {
          id: "escaped",
          name: "Doubled quotes stand for one",
          args: ['"say ""hi""",2'],
          expected: [['say "hi"', "2"]],
        },
        {
          id: "empty-quoted",
          name: "An empty quoted field",
          args: ['a,"",b'],
          expected: [["a", "", "b"]],
        },
        {
          id: "just-a-quote",
          name: "A field holding only a quote character",
          args: ['""""'],
          expected: [['"']],
        },
        {
          id: "literal",
          name: "A quote inside an unquoted field is ordinary",
          args: ['ruler,12" steel'],
          expected: [["ruler", '12" steel']],
        },
        {
          id: "after-close",
          name: "Text after a closing quote is an error",
          args: ['"a"b,c'],
          throws: true,
        },
        {
          id: "unclosed",
          name: "A quote that never closes is an error",
          args: ['"abc,d'],
          throws: true,
        },
        {
          id: "plain",
          name: "Plain rows still parse",
          args: ["a,b\r\nc,d\r\n"],
          expected: [["a", "b"], ["c", "d"]],
        },
      ]),
    },
    {
      title: "Line breaks and records",
      short: "Records",
      solutionNote:
        "Moving the row break into the state machine, so a line break ends a row only outside quotes, is the whole fix, and the states from step 2 carry over unchanged. `toRecords` then pairs names with values by position using `Object.fromEntries`, and checking the field count first is what stops a short row from quietly filling its last columns with `undefined`.",
      signature: `function parseCsv(text: string): string[][]
function toRecords(text: string): Record<string, string>[]`,
      prompt: [
        'Spreadsheets also put line breaks inside quoted fields: a note typed over two lines is saved as `"first line\\nsecond line"`, and that line break belongs to the field. Splitting the text into lines first cannot survive that, so rework `parseCsv` to scan the whole text in one pass, keeping a line break inside quotes exactly as written (`\\n` or `\\r\\n`).',
        'Then add `toRecords`, which treats the first row as the header and turns every other row into an object keyed by the header names: `"sku,qty\\nbolt,40"` becomes `[{ sku: "bolt", qty: "40" }]`. Values stay strings. An empty text, or a header with no rows under it, gives `[]`. A row whose field count differs from the header\'s is an error: throw rather than guess which column is missing.',
      ],
      starter: `${CSV_QUOTED}
function toRecords(text) {
  // The first row names the columns. parseCsv must also keep line breaks inside quotes.
  return [];
}
`,
      solution: CSV_RECORDS,
      tests: [
        ...jsCases("parseCsv", [
          {
            id: "multiline",
            name: "A line break inside quotes",
            args: ['id,note\n7,"first line\nsecond line"\n8,short\n'],
            expected: [["id", "note"], ["7", "first line\nsecond line"], ["8", "short"]],
          },
          {
            id: "crlf-inside",
            name: "A Windows line break inside quotes is kept as written",
            args: ['"x\r\ny",1\r\n'],
            expected: [["x\r\ny", "1"]],
          },
          {
            id: "unclosed-across",
            name: "A quote that never closes is still an error",
            args: ['"abc\ndef'],
            throws: true,
          },
          {
            id: "earlier",
            name: "Earlier rules still hold",
            args: ['a,"",b\n"say ""hi""",\n'],
            expected: [["a", "", "b"], ['say "hi"', ""]],
          },
        ]),
        ...jsCases("toRecords", [
          {
            id: "records",
            name: "Rows become records",
            args: ['sku,name,price\nA-1,"Bolt, M6",0.20\nA-2,"Washer ""flat""",0.05\n'],
            expected: [
              { sku: "A-1", name: "Bolt, M6", price: "0.20" },
              { sku: "A-2", name: 'Washer "flat"', price: "0.05" },
            ],
          },
          {
            id: "record-multiline",
            name: "A record with a two-line note",
            args: ['id,note\n7,"first line\nsecond line"\n'],
            expected: [{ id: "7", note: "first line\nsecond line" }],
          },
          { id: "header-only", name: "A header with no rows", args: ["sku,qty\n"], expected: [] },
          {
            id: "short-row",
            name: "A row with too few fields",
            args: ["sku,qty\nbolt,40\nnut\n"],
            throws: true,
          },
        ]),
      ],
    },
  ],
);

// ─── Game of Life ────────────────────────────────────────────────────

const NEIGHBOURS = `function liveNeighbours(grid, row, col) {
  let count = 0;
  for (let r = row - 1; r <= row + 1; r++) {
    for (let c = col - 1; c <= col + 1; c++) {
      if ((r !== row || c !== col) && grid[r]?.[c] === "#") count++;
    }
  }
  return count;
}
`;

const NEXT_GENERATION = `${NEIGHBOURS}
function nextGeneration(grid) {
  return grid.map((line, row) =>
    [...line]
      .map((cell, col) => {
        const n = liveNeighbours(grid, row, col);
        return n === 3 || (cell === "#" && n === 2) ? "#" : ".";
      })
      .join(""),
  );
}
`;

const BLINKER = [".....", "..#..", "..#..", "..#..", "....."];
const BLOCK = ["....", ".##.", ".##.", "...."];

const GAME_OF_LIFE = codeSteps(
  {
    slug: "game-of-life",
    title: "Game of Life",
    difficulty: "Intermediate",
    topic: "Grid simulation",
    language: "javascript",
    description:
      "Simulate Conway's Game of Life on a bounded grid, then detect the generation where the pattern starts repeating.",
    solutionNote:
      "Every cell of the next generation is computed from the old grid, never from a half-updated one, which is why building fresh rows is safer than editing in place. Spotting a repeat then needs a memory of every generation, not just the last: a `Map` from the grid's text to the generation it first appeared catches oscillators and still lifes alike, in one lookup per generation.",
  },
  [
    {
      title: "Count the neighbours",
      short: "Neighbours",
      solutionNote:
        'Looping over the 3 by 3 block around the cell and skipping its centre is shorter than listing eight offsets, and optional chaining, `grid[r]?.[c]`, turns every read past the edge into `undefined`, which is not `"#"`, so the edges need no special case. Negative indices are safe for the same reason: `grid[-1]` is `undefined` in JavaScript, not the last row as it would be in Python.',
      signature: "function liveNeighbours(grid: string[], row: number, col: number): number",
      prompt: [
        'A grid is an array of equal-length strings, `"#"` for a live cell and `"."` for a dead one. Return how many of the eight cells around `grid[row][col]` are alive, not counting the cell itself.',
        "The grid does not wrap around: a cell on the edge simply has fewer neighbours, and everything beyond the edge counts as dead. `row` and `col` are always inside the grid.",
      ],
      starter: `function liveNeighbours(grid, row, col) {
  let count = 0;
  // Look at the 3 by 3 block around (row, col), skipping the cell itself and anything off the grid.
  return count;
}
`,
      solution: NEIGHBOURS,
      tests: jsCases("liveNeighbours", [
        { id: "beside", name: "Beside a vertical line", args: [[".#.", ".#.", ".#."], 1, 0], expected: 3 },
        { id: "self", name: "The cell itself does not count", args: [[".#.", ".#.", ".#."], 1, 1], expected: 2 },
        { id: "corner", name: "No wrapping at the corners", args: [["#..#", "....", "#..#"], 0, 0], expected: 0 },
        { id: "surrounded", name: "Surrounded on all sides", args: [["###", "###", "###"], 1, 1], expected: 8 },
        { id: "top-edge", name: "On the top edge", args: [["##.", "#..", "..."], 0, 2], expected: 1 },
        { id: "right-edge", name: "On the right edge of a wide grid", args: [["#....", ".#...", "....#"], 1, 4], expected: 1 },
        { id: "one-cell", name: "A one-cell grid", args: [["#"], 0, 0], expected: 0 },
      ]),
    },
    {
      title: "Step one generation",
      short: "Generation",
      solutionNote:
        "Reading every count from the old grid while writing to a new one is the whole rule. Update cells in place and a cell born early in a row is counted as a neighbour by the cells after it, so a blinker grows into a blob; strings make that mistake hard to make, since there is nothing to assign into and each new row is built with `map` and `join`.",
      signature: "function nextGeneration(grid: string[]): string[]",
      prompt: [
        "Return the next generation of the whole grid, the same size as the input. A live cell with two or three live neighbours stays alive, a dead cell with exactly three comes alive, and every other cell is dead in the next generation.",
        "All cells change at once: every count is taken from the grid you were given, never from cells you have already updated. Return a new array and leave the input as it was.",
      ],
      starter: `${NEIGHBOURS}
function nextGeneration(grid) {
  // Count from the old grid, write into new rows.
  return grid;
}
`,
      solution: NEXT_GENERATION,
      tests: jsCases("nextGeneration", [
        {
          id: "blinker",
          name: "A blinker turns on its side",
          args: [BLINKER],
          expected: [".....", ".....", ".###.", ".....", "....."],
          noMutation: true,
        },
        { id: "block", name: "A block stays still", args: [BLOCK], expected: BLOCK },
        { id: "lonely", name: "A lonely cell dies", args: [["...", ".#.", "..."]], expected: ["...", "...", "..."] },
        {
          id: "crowded",
          name: "Overcrowded cells die",
          args: [["###", "###", "###"]],
          expected: ["#.#", "...", "#.#"],
        },
        {
          id: "birth",
          name: "Exactly three neighbours bring a cell to life",
          args: [[".#.", "#..", "..#"]],
          expected: ["...", ".#.", "..."],
        },
        {
          id: "glider",
          name: "A glider moves",
          args: [[".#....", "..#...", "###...", "......", "......", "......"]],
          expected: ["......", "#.#...", ".##...", ".#....", "......", "......"],
        },
        { id: "empty", name: "An empty grid", args: [[]], expected: [] },
      ]),
    },
    {
      title: "Detect a repeat",
      short: "Repeat",
      solutionNote:
        'Two arrays are never `===` each other, so each generation needs a key: `grid.join("\\n")` is a string that is equal exactly when the grids are. A `Map` from those keys to the generation that first produced them answers both questions in one lookup; checking only against the previous generation would catch a block but run straight past a blinker.',
      signature:
        "function firstRepeat(grid: string[], n: number): { generation: number, sameAs: number } | null",
      prompt: [
        "On a bounded grid every pattern eventually repeats. The grid you are given is generation `0`; run up to `n` generations and return the first one that is identical to an earlier generation, as `{ generation, sameAs }` where `sameAs` is the earlier generation it matches. If none of generations 1 to `n` repeats, return `null`.",
        "A still life repeats at once: a block gives `{ generation: 1, sameAs: 0 }`. A blinker flips between two shapes and gives `{ generation: 2, sameAs: 0 }`. A lone cell dies, and the empty grid then repeats itself, giving `{ generation: 2, sameAs: 1 }`: the match can be any earlier generation, not only the first or the one just before.",
      ],
      starter: `${NEXT_GENERATION}
function firstRepeat(grid, n) {
  let current = grid;
  for (let generation = 1; generation <= n; generation++) {
    current = nextGeneration(current);
    // Has this exact grid appeared before, and in which generation?
  }
  return null;
}
`,
      solution: `${NEXT_GENERATION}
function firstRepeat(grid, n) {
  const seen = new Map([[grid.join("\\n"), 0]]);
  let current = grid;
  for (let generation = 1; generation <= n; generation++) {
    current = nextGeneration(current);
    const key = current.join("\\n");
    if (seen.has(key)) return { generation, sameAs: seen.get(key) };
    seen.set(key, generation);
  }
  return null;
}
`,
      tests: jsCases("firstRepeat", [
        { id: "block", name: "A block repeats at once", args: [BLOCK, 10], expected: { generation: 1, sameAs: 0 } },
        {
          id: "blinker",
          name: "A blinker repeats every other generation",
          args: [BLINKER, 10],
          expected: { generation: 2, sameAs: 0 },
          noMutation: true,
        },
        {
          id: "dies",
          name: "A lone cell dies, then the empty grid repeats",
          args: [["...", ".#.", "..."], 10],
          expected: { generation: 2, sameAs: 1 },
        },
        {
          id: "too-few",
          name: "Too few generations to see a repeat",
          args: [BLINKER, 1],
          expected: null,
        },
        { id: "zero", name: "Zero generations", args: [BLOCK, 0], expected: null },
        {
          id: "glider",
          name: "A glider runs into the corner",
          description: "It settles into a block on generation 15.",
          args: [[".#....", "..#...", "###...", "......", "......", "......"], 50],
          expected: { generation: 16, sameAs: 15 },
        },
        {
          id: "late-cycle",
          name: "A pattern that settles into a cycle later",
          description: "Generation 23 matches generation 3, not the start.",
          args: [[".......", ".......", "..###..", "...#...", ".......", ".......", "......."], 50],
          expected: { generation: 23, sameAs: 3 },
        },
      ]),
    },
  ],
);

export const CODE_MULTI_JS_APPS: Challenge[] = [
  SHOPPING_CART,
  TEXT_EDITOR_HISTORY,
  EVENT_EMITTER,
  LINE_DIFF,
  CRON_SCHEDULE,
  CSV_QUOTED_FIELDS,
  GAME_OF_LIFE,
];
