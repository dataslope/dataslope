/**
 * Multi-step Python challenges: small tools, built in stages.
 *
 * Each of these ends up as something you could actually import — a table
 * renderer, a numeral converter, a stock reconciler, a graph search. That is
 * what makes the step rail worth having here: step 1 is a function with its
 * own tests, step 2 calls it, and by step 3 the learner has a module rather
 * than an answer.
 *
 * Shared constants carry each accepted program into the next step's starter,
 * so a fix in step 1 cannot leave step 3 quoting code that no longer exists.
 * `__tests__/challengeSolutions` runs every step under `python3`.
 */

import { codeSteps } from "./authoring";
import type { Challenge } from "./types";

// ─── Markdown table renderer ─────────────────────────────────────────

const WIDTHS = `def column_widths(rows: list[list[str]]) -> list[int]:
    if not rows:
        return []
    widths = [0] * len(rows[0])
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))
    return widths
`;

const RENDER_ROW = `${WIDTHS}

def render_row(cells: list[str], widths: list[int]) -> str:
    padded = [cell.ljust(width) for cell, width in zip(cells, widths)]
    return "| " + " | ".join(padded) + " |"
`;

const MARKDOWN_TABLE = codeSteps(
  {
    slug: "markdown-table",
    title: "Markdown Table Renderer",
    difficulty: "Intermediate",
    topic: "Formatting",
    language: "python",
    description:
      "Render rows as an aligned Markdown table: measure the columns, pad a row, then assemble the whole thing.",
    solutionNote: [
      "Measuring every column before drawing anything is what makes the table line up — you cannot pad a cell until you know the widest value below it, which means a full pass over the data before a single character of output. It is the same reason a terminal table renderer buffers its input instead of streaming it.",
    ],
  },
  [
    {
      title: "Measure the columns",
      short: "Widths",
      solutionNote: [
        "You cannot pad a cell until you know the widest value below it, which means a full pass over the data before a single character of output. That is why a terminal table renderer buffers its input instead of streaming it, and why this has to be its own step.",
      ],
      signature: "def column_widths(rows: list[list[str]]) -> list[int]",
      prompt: [
        "Before anything can be aligned, you need to know how wide each column has to be: the length of the longest cell in it.",
        "Every row has the same number of cells. No rows at all means no columns.",
      ],
      starter: `def column_widths(rows: list[list[str]]) -> list[int]:
    if not rows:
        return []
    widths = [0] * len(rows[0])
    # The widest cell in each column wins.
    return widths
`,
      solution: WIDTHS,
      tests: [
        {
          id: "basic",
          name: "The longest cell sets the width",
          code: `got = column_widths([["a", "bb"], ["ccc", "d"]])
assert got == [3, 2], f"got {got}"`,
        },
        {
          id: "header-wins",
          name: "The header can be the longest",
          code: `got = column_widths([["header", "x"], ["a", "y"]])
assert got == [6, 1], f"got {got}"`,
        },
        {
          id: "single-row",
          name: "A single row",
          code: `assert column_widths([["ab", "c"]]) == [2, 1]`,
        },
        {
          id: "empty",
          name: "No rows",
          code: `assert column_widths([]) == []`,
        },
        {
          id: "empty-cells",
          name: "Empty cells are width zero",
          code: `assert column_widths([["", "x"]]) == [0, 1]`,
        },
      ],
    },
    {
      title: "Render one row",
      short: "Row",
      solutionNote: [
        { code: "zip(cells, widths)" },
        " pairs each cell with its column and stops at the shorter list, so a row with fewer cells renders short rather than raising. ",
        { code: "ljust" },
        " leaves a cell already at full width untouched, which is what makes the exact-fit case free.",
      ],
      signature: "def render_row(cells: list[str], widths: list[int]) -> str",
      prompt: [
        [
          "Turn a list of cells into one Markdown row: a leading ",
          { code: "| " },
          ", cells padded on the right to their column width and separated by ",
          { code: " | " },
          ", then a trailing ",
          { code: " |" },
          ".",
        ],
        [
          { code: 'render_row(["a", "bb"], [3, 2])' },
          " gives ",
          { code: '"| a   | bb |"' },
          ".",
        ],
      ],
      starter: `${WIDTHS}

def render_row(cells: list[str], widths: list[int]) -> str:
    # Pad each cell to its column width, then join with pipes.
    return ""
`,
      solution: RENDER_ROW,
      tests: [
        {
          id: "padding",
          name: "Cells are padded to their column width",
          code: `got = render_row(["a", "bb"], [3, 2])
assert got == "| a   | bb |", f"got {got!r}"`,
        },
        {
          id: "exact",
          name: "A cell already at full width is not padded further",
          code: `got = render_row(["abc"], [3])
assert got == "| abc |", f"got {got!r}"`,
        },
        {
          id: "empty-cell",
          name: "An empty cell still takes its space",
          code: `got = render_row(["", "x"], [2, 1])
assert got == "|    | x |", f"got {got!r}"`,
        },
        {
          id: "single-column",
          name: "A single column",
          code: `assert render_row(["hi"], [5]) == "| hi    |", f"got {render_row(['hi'], [5])!r}"`,
        },
        {
          id: "widths-still-work",
          name: "column_widths still works",
          code: `assert column_widths([["a", "bb"]]) == [1, 2]`,
        },
      ],
    },
    {
      title: "Assemble the table",
      short: "Table",
      solutionNote: [
        "Rendering the separator through the same ",
        { code: "render_row" },
        " as every other line is what guarantees the pipes line up. Building it as its own string with its own spacing is where hand-written table renderers drift by one character and stop being tables.",
      ],
      signature: "def render_table(rows: list[list[str]]) -> list[str]",
      prompt: [
        "Put it together: the first row is the header, then a separator row of dashes, then the rest.",
        [
          "Each separator cell is as many dashes as the column is wide, formatted the same way as any other row. Return the lines as a list, not one joined string — the caller decides how to end them.",
        ],
      ],
      starter: `${RENDER_ROW}

def render_table(rows: list[list[str]]) -> list[str]:
    if not rows:
        return []
    widths = column_widths(rows)
    # Header, separator, then the body.
    return []
`,
      solution: `${RENDER_ROW}

def render_table(rows: list[list[str]]) -> list[str]:
    if not rows:
        return []
    widths = column_widths(rows)
    lines = [render_row(rows[0], widths)]
    lines.append(render_row(["-" * width for width in widths], widths))
    for row in rows[1:]:
        lines.append(render_row(row, widths))
    return lines
`,
      tests: [
        {
          id: "basic",
          name: "Header, separator, body",
          code: `got = render_table([["h1", "h2"], ["a", "bbb"]])
assert got == [
    "| h1 | h2  |",
    "| -- | --- |",
    "| a  | bbb |",
], f"got {got}"`,
        },
        {
          id: "header-only",
          name: "A header with no body rows",
          code: `got = render_table([["only"]])
assert got == ["| only |", "| ---- |"], f"got {got}"`,
        },
        {
          id: "alignment",
          name: "Every line is the same length",
          description: "That is what makes the table read as a table.",
          code: `got = render_table([["a", "bbbb"], ["ccc", "d"], ["e", "ff"]])
lengths = {len(line) for line in got}
assert len(lengths) == 1, f"lines differ in length: {[len(l) for l in got]}"`,
        },
        {
          id: "empty",
          name: "No rows at all",
          code: `assert render_table([]) == []`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert column_widths([["ab"]]) == [2]
assert render_row(["a"], [2]) == "| a  |"`,
        },
      ],
    },
  ],
);

// ─── Roman numerals ──────────────────────────────────────────────────

const TO_ROMAN = `NUMERALS = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]


def to_roman(n: int) -> str:
    out = []
    for value, symbol in NUMERALS:
        while n >= value:
            out.append(symbol)
            n -= value
    return "".join(out)
`;

const FROM_ROMAN = `${TO_ROMAN}

VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}


def from_roman(text: str) -> int:
    total = 0
    for i, ch in enumerate(text):
        value = VALUES[ch]
        if i + 1 < len(text) and value < VALUES[text[i + 1]]:
            total -= value
        else:
            total += value
    return total
`;

const ROMAN_NUMERALS = codeSteps(
  {
    slug: "roman-numerals",
    title: "Roman Numerals",
    difficulty: "Intermediate",
    topic: "Encoding",
    language: "python",
    description:
      "Convert numbers to Roman numerals and back, then use the round trip to tell a valid numeral from a plausible-looking one.",
    solutionNote: [
      "Putting the subtractive pairs — ",
      { code: "CM" },
      ", ",
      { code: "XL" },
      ", ",
      { code: "IV" },
      " — into the value table as if they were ordinary symbols is what removes every special case from the encoder: a plain greedy loop then produces them without knowing they are special. Validation falls out of the same table, because exactly one spelling of each number survives a round trip.",
    ],
  },
  [
    {
      title: "Number to numeral",
      short: "Encode",
      solutionNote: [
        "Putting the subtractive pairs into the value table as if they were ordinary symbols is what removes every special case: a plain greedy loop then produces ",
        { code: "CM" },
        " and ",
        { code: "IV" },
        " without knowing they are special. The table is the algorithm; the loop is three lines.",
      ],
      signature: "def to_roman(n: int) -> str",
      prompt: [
        [
          "Convert a number from 1 to 3999 into a Roman numeral. Take the largest value that fits, append its symbol, subtract it, and repeat.",
        ],
        [
          "The subtractive pairs are already in the table above the function: ",
          { code: "900 → CM" },
          ", ",
          { code: "400 → CD" },
          ", ",
          { code: "90 → XC" },
          ", ",
          { code: "40 → XL" },
          ", ",
          { code: "9 → IX" },
          ", ",
          { code: "4 → IV" },
          ". Because they are in the table, the greedy loop handles them with no extra code.",
        ],
      ],
      starter: `NUMERALS = [
    (1000, "M"), (900, "CM"), (500, "D"), (400, "CD"),
    (100, "C"), (90, "XC"), (50, "L"), (40, "XL"),
    (10, "X"), (9, "IX"), (5, "V"), (4, "IV"), (1, "I"),
]


def to_roman(n: int) -> str:
    out = []
    # Largest value that fits, as many times as it fits, then move on.
    return "".join(out)
`,
      solution: TO_ROMAN,
      tests: [
        {
          id: "simple",
          name: "Repeated symbols",
          code: `assert to_roman(3) == "III", f"got {to_roman(3)!r}"
assert to_roman(2000) == "MM", f"got {to_roman(2000)!r}"`,
        },
        {
          id: "subtractive",
          name: "The subtractive pairs",
          code: `assert to_roman(4) == "IV", f"got {to_roman(4)!r}"
assert to_roman(9) == "IX", f"got {to_roman(9)!r}"
assert to_roman(40) == "XL", f"got {to_roman(40)!r}"
assert to_roman(900) == "CM", f"got {to_roman(900)!r}"`,
        },
        {
          id: "compound",
          name: "A compound number",
          code: `assert to_roman(1994) == "MCMXCIV", f"got {to_roman(1994)!r}"
assert to_roman(58) == "LVIII", f"got {to_roman(58)!r}"`,
        },
        {
          id: "bounds",
          name: "The ends of the range",
          code: `assert to_roman(1) == "I"
assert to_roman(3999) == "MMMCMXCIX", f"got {to_roman(3999)!r}"`,
        },
      ],
    },
    {
      title: "Numeral to number",
      short: "Decode",
      solutionNote: [
        "One rule — subtract when a symbol is worth less than the one after it — covers every subtractive pair without listing any of them. Looking ahead rather than behind is what keeps it a single forward pass.",
      ],
      signature: "def from_roman(text: str) -> int",
      prompt: [
        [
          "Now the other direction. Walk the numeral left to right and add each symbol's value — unless the symbol is worth less than the one after it, in which case subtract it.",
        ],
        [
          "That single rule handles every subtractive pair: in ",
          { code: "IX" },
          " the ",
          { code: "I" },
          " comes before a larger symbol, so it counts as −1.",
        ],
      ],
      starter: `${TO_ROMAN}

VALUES = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}


def from_roman(text: str) -> int:
    total = 0
    # Smaller before larger means subtract, otherwise add.
    return total
`,
      solution: FROM_ROMAN,
      tests: [
        {
          id: "simple",
          name: "Repeated symbols add up",
          code: `assert from_roman("III") == 3, f"got {from_roman('III')}"
assert from_roman("MM") == 2000`,
        },
        {
          id: "subtractive",
          name: "Smaller before larger subtracts",
          code: `assert from_roman("IV") == 4, f"got {from_roman('IV')}"
assert from_roman("IX") == 9
assert from_roman("CM") == 900`,
        },
        {
          id: "compound",
          name: "A compound numeral",
          code: `assert from_roman("MCMXCIV") == 1994, f"got {from_roman('MCMXCIV')}"
assert from_roman("LVIII") == 58`,
        },
        {
          id: "round-trip",
          name: "Every number survives the round trip",
          code: `for n in range(1, 1000):
    assert from_roman(to_roman(n)) == n, f"{n} became {to_roman(n)} and back to {from_roman(to_roman(n))}"`,
        },
        {
          id: "empty",
          name: "An empty numeral is zero",
          code: `assert from_roman("") == 0`,
        },
      ],
    },
    {
      title: "Reject bad numerals",
      short: "Validate",
      solutionNote: [
        "Round-tripping is the whole validator: exactly one spelling of each number survives ",
        { code: "from_roman" },
        " then ",
        { code: "to_roman" },
        ", so anything that comes back different was not canonical. It is far shorter than the regular expression that encodes the same rules, and it cannot disagree with the encoder.",
      ],
      signature: "def is_valid_roman(text: str) -> bool",
      prompt: [
        [
          { code: "IIII" },
          " decodes to 4 quite happily, but it is not how 4 is written. Add ",
          { code: "is_valid_roman" },
          ", which accepts only the canonical spelling.",
        ],
        [
          "You already have everything you need: decode it, encode the result, and see whether you get the same text back. An empty string and anything containing a symbol that is not a numeral are both invalid.",
        ],
      ],
      starter: `${FROM_ROMAN}

def is_valid_roman(text: str) -> bool:
    # Decode it, re-encode it, and see whether it comes back unchanged.
    return False
`,
      solution: `${FROM_ROMAN}

def is_valid_roman(text: str) -> bool:
    if not text:
        return False
    if any(ch not in VALUES for ch in text):
        return False
    return to_roman(from_roman(text)) == text
`,
      tests: [
        {
          id: "valid",
          name: "Canonical numerals are valid",
          code: `for text in ["I", "IV", "IX", "LVIII", "MCMXCIV", "MMMCMXCIX"]:
    assert is_valid_roman(text) is True, text + " should be valid"`,
        },
        {
          id: "non-canonical",
          name: "A decodable but wrong spelling is rejected",
          description: "IIII is 4, but 4 is written IV.",
          code: `assert is_valid_roman("IIII") is False
assert is_valid_roman("VIIII") is False`,
        },
        {
          id: "junk",
          name: "Characters that are not numerals",
          code: `assert is_valid_roman("ABC") is False
assert is_valid_roman("MCMXCIV!") is False`,
        },
        {
          id: "empty",
          name: "An empty string is not a numeral",
          code: `assert is_valid_roman("") is False`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert to_roman(1994) == "MCMXCIV"
assert from_roman("MCMXCIV") == 1994`,
        },
      ],
    },
  ],
);

// ─── Inventory diff ──────────────────────────────────────────────────

const TALLY = `def tally(items: list[str]) -> dict[str, int]:
    counts = {}
    for item in items:
        counts[item] = counts.get(item, 0) + 1
    return counts
`;

const DELTAS = `${TALLY}

def deltas(before: list[str], after: list[str]) -> list[list]:
    old = tally(before)
    new = tally(after)
    out = []
    for item in sorted(set(old) | set(new)):
        change = new.get(item, 0) - old.get(item, 0)
        if change != 0:
            out.append([item, change])
    return out
`;

const INVENTORY_DIFF = codeSteps(
  {
    slug: "inventory-diff",
    title: "Inventory Diff",
    difficulty: "Intermediate",
    topic: "Reconciliation",
    language: "python",
    description:
      "Compare two stock counts: tally each one, work out what moved, then write it up.",
    solutionNote: [
      "Comparing the tallies rather than the lists is what makes this work on quantities instead of membership: a set difference would tell you that ",
      { code: "apple" },
      " is in both lists and stop there, when the interesting fact is that there are now two more of them. Taking the union of the keys is what stops an item that vanished entirely from being missed.",
    ],
  },
  [
    {
      title: "Count what is there",
      short: "Tally",
      solutionNote: [
        "An empty list tallying to an empty dictionary, rather than to zeros for every item you might have seen, is what keeps this composable: the tally describes what is there, and step 2 is where absence gets a meaning.",
      ],
      signature: "def tally(items: list[str]) -> dict[str, int]",
      prompt: [
        "Turn a list of item names into a count per name. An item appearing three times counts as three.",
        "An empty list tallies to an empty dictionary, not to zeros for items you have not seen.",
      ],
      starter: `def tally(items: list[str]) -> dict[str, int]:
    counts = {}
    for item in items:
        # One more of this item.
        pass
    return counts
`,
      solution: TALLY,
      tests: [
        {
          id: "basic",
          name: "Repeats are counted",
          code: `got = tally(["apple", "pear", "apple"])
assert got == {"apple": 2, "pear": 1}, f"got {got}"`,
        },
        {
          id: "single",
          name: "One of each",
          code: `assert tally(["a", "b"]) == {"a": 1, "b": 1}`,
        },
        {
          id: "empty",
          name: "An empty list",
          code: `assert tally([]) == {}`,
        },
        {
          id: "many",
          name: "A thousand of one item",
          code: `assert tally(["x"] * 1000) == {"x": 1000}`,
        },
      ],
    },
    {
      title: "Work out what moved",
      short: "Deltas",
      solutionNote: [
        "Taking the union of both sets of keys is what stops an item that disappeared entirely from being missed — iterating the new tally alone would never mention it. Comparing tallies rather than lists is also what makes this work on quantities: a set difference would say ",
        { code: "apple" },
        " is in both and stop there.",
      ],
      signature:
        "def deltas(before: list[str], after: list[str]) -> list[list]",
      prompt: [
        [
          "Compare two stock counts and return ",
          { code: "[item, change]" },
          " for every item whose count changed, sorted by item.",
        ],
        [
          "The change is positive when there are more than before and negative when there are fewer. Items whose count is unchanged do not appear, and an item that is only in one of the two lists still has to be found — so take the union of both sets of keys, not just one.",
        ],
      ],
      starter: `${TALLY}

def deltas(before: list[str], after: list[str]) -> list[list]:
    old = tally(before)
    new = tally(after)
    out = []
    # Every item in either tally, and only the ones that changed.
    return out
`,
      solution: DELTAS,
      tests: [
        {
          id: "both-ways",
          name: "Gains and losses",
          code: `got = deltas(["apple", "apple", "pear"], ["apple", "apple", "apple"])
assert got == [["apple", 1], ["pear", -1]], f"got {got}"`,
        },
        {
          id: "unchanged",
          name: "Unchanged items do not appear",
          code: `assert deltas(["a", "b"], ["b", "a"]) == [], f"got {deltas(['a', 'b'], ['b', 'a'])}"`,
        },
        {
          id: "only-after",
          name: "An item that is entirely new",
          code: `assert deltas([], ["new"]) == [["new", 1]], f"got {deltas([], ['new'])}"`,
        },
        {
          id: "only-before",
          name: "An item that has gone entirely",
          description: "Taking the keys of only one tally would miss it.",
          code: `assert deltas(["gone"], []) == [["gone", -1]], f"got {deltas(['gone'], [])}"`,
        },
        {
          id: "sorted",
          name: "Sorted by item name",
          code: `got = deltas([], ["z", "a"])
assert got == [["a", 1], ["z", 1]], f"got {got}"`,
        },
        {
          id: "empty",
          name: "Two empty counts",
          code: `assert deltas([], []) == []`,
        },
      ],
    },
    {
      title: "Write it up",
      short: "Report",
      solutionNote: [
        "Formatting is deliberately the last step and knows nothing about tallies. That separation is why changing the output to JSON, or to a table, touches one function rather than three.",
      ],
      signature: "def report(before: list[str], after: list[str]) -> list[str]",
      prompt: [
        [
          "Turn the deltas into readable lines: ",
          { code: '"+2 apple"' },
          " for a gain of two, ",
          { code: '"-1 pear"' },
          " for a loss of one.",
        ],
        "Same order as step 2, and unchanged items still do not appear.",
      ],
      starter: `${DELTAS}

def report(before: list[str], after: list[str]) -> list[str]:
    lines = []
    for item, change in deltas(before, after):
        # A sign, the size of the change, then the item.
        pass
    return lines
`,
      solution: `${DELTAS}

def report(before: list[str], after: list[str]) -> list[str]:
    lines = []
    for item, change in deltas(before, after):
        sign = "+" if change > 0 else "-"
        lines.append(sign + str(abs(change)) + " " + item)
    return lines
`,
      tests: [
        {
          id: "both-ways",
          name: "Gains and losses read correctly",
          code: `got = report(["apple", "apple", "pear"], ["apple", "apple", "apple"])
assert got == ["+1 apple", "-1 pear"], f"got {got}"`,
        },
        {
          id: "bigger",
          name: "A change of more than one",
          code: `got = report(["x"], ["x", "x", "x"])
assert got == ["+2 x"], f"got {got}"`,
        },
        {
          id: "nothing",
          name: "Nothing changed",
          code: `assert report(["a"], ["a"]) == []
assert report([], []) == []`,
        },
        {
          id: "gone",
          name: "An item that disappeared",
          code: `assert report(["gone", "gone"], []) == ["-2 gone"], f"got {report(['gone', 'gone'], [])}"`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert tally(["a", "a"]) == {"a": 2}
assert deltas(["a"], []) == [["a", -1]]`,
        },
      ],
    },
  ],
);

// ─── Graph search ────────────────────────────────────────────────────

const ADJACENCY = `def build_adjacency(nodes: list[str], edges: list[list[str]]) -> dict[str, list[str]]:
    adjacency = {node: [] for node in nodes}
    for a, b in edges:
        adjacency[a].append(b)
        adjacency[b].append(a)
    return {node: sorted(neighbours) for node, neighbours in adjacency.items()}
`;

const REACHABLE = `${ADJACENCY}

def reachable(nodes: list[str], edges: list[list[str]], start: str) -> list[str]:
    adjacency = build_adjacency(nodes, edges)
    if start not in adjacency:
        return []
    seen = {start}
    queue = [start]
    while queue:
        node = queue.pop(0)
        for nxt in adjacency[node]:
            if nxt not in seen:
                seen.add(nxt)
                queue.append(nxt)
    return sorted(seen)
`;

const GRAPH_SEARCH = codeSteps(
  {
    slug: "graph-search",
    title: "Graph Search",
    difficulty: "Advanced",
    topic: "Breadth-first search",
    language: "python",
    description:
      "Search an undirected graph: build the adjacency map, find everything reachable, then measure the shortest hop count.",
    solutionNote: [
      "The same breadth-first walk answers both questions, and the difference is only what you carry along. Marking a node as seen the moment it is queued — not when it is dequeued — is the detail that matters: do it the other way and a node with several neighbours gets queued repeatedly, and on a dense graph the queue explodes.",
    ],
  },
  [
    {
      title: "Build the adjacency map",
      short: "Adjacency",
      solutionNote: [
        "Seeding the map from the node list rather than from the edges is what keeps an isolated node visible; building it from edges alone silently drops anyone with no connections. Adding both directions is what makes the graph undirected — the data only stores each edge once.",
      ],
      signature:
        "def build_adjacency(nodes: list[str], edges: list[list[str]]) -> dict[str, list[str]]",
      prompt: [
        [
          "Turn a node list and a list of ",
          { code: "[a, b]" },
          " edges into a map from each node to its neighbours, sorted.",
        ],
        [
          "The graph is undirected, so every edge goes in both directions. A node with no edges is still in the map, with an empty list — dropping it would make it invisible to everything downstream.",
        ],
      ],
      starter: `def build_adjacency(nodes: list[str], edges: list[list[str]]) -> dict[str, list[str]]:
    adjacency = {node: [] for node in nodes}
    for a, b in edges:
        # Undirected: the edge goes both ways.
        pass
    return adjacency
`,
      solution: ADJACENCY,
      tests: [
        {
          id: "both-ways",
          name: "Edges go in both directions",
          code: `got = build_adjacency(["a", "b"], [["a", "b"]])
assert got == {"a": ["b"], "b": ["a"]}, f"got {got}"`,
        },
        {
          id: "sorted",
          name: "Neighbours come out sorted",
          code: `got = build_adjacency(["a", "b", "c"], [["a", "c"], ["a", "b"]])
assert got["a"] == ["b", "c"], f"got {got['a']}"`,
        },
        {
          id: "isolated",
          name: "A node with no edges is still in the map",
          code: `got = build_adjacency(["a", "lonely"], [])
assert got == {"a": [], "lonely": []}, f"got {got}"`,
        },
        {
          id: "empty",
          name: "An empty graph",
          code: `assert build_adjacency([], []) == {}`,
        },
      ],
    },
    {
      title: "Find what is reachable",
      short: "Reachable",
      solutionNote: [
        "Marking a node as seen when it is ",
        { code: "queued" },
        " rather than when it is dequeued is the detail that matters: the other way round, a node with several neighbours gets queued repeatedly and on a dense graph the queue explodes. It is also what makes a cycle terminate rather than loop.",
      ],
      signature:
        "def reachable(nodes: list[str], edges: list[list[str]], start: str) -> list[str]",
      prompt: [
        [
          "Return every node reachable from ",
          { code: "start" },
          ", including ",
          { code: "start" },
          " itself, sorted.",
        ],
        [
          "Walk outward with a queue, marking each node as seen when you add it. A node not in the graph at all reaches nothing.",
        ],
      ],
      starter: `${ADJACENCY}

def reachable(nodes: list[str], edges: list[list[str]], start: str) -> list[str]:
    adjacency = build_adjacency(nodes, edges)
    if start not in adjacency:
        return []
    seen = {start}
    queue = [start]
    # Walk outward, one ring at a time.
    return sorted(seen)
`,
      solution: REACHABLE,
      tests: [
        {
          id: "chain",
          name: "A chain is reachable end to end",
          code: `got = reachable(["a", "b", "c"], [["a", "b"], ["b", "c"]], "a")
assert got == ["a", "b", "c"], f"got {got}"`,
        },
        {
          id: "components",
          name: "A separate component is not reachable",
          code: `got = reachable(["a", "b", "x", "y"], [["a", "b"], ["x", "y"]], "a")
assert got == ["a", "b"], f"got {got}"`,
        },
        {
          id: "isolated",
          name: "An isolated node reaches only itself",
          code: `assert reachable(["lonely"], [], "lonely") == ["lonely"]`,
        },
        {
          id: "unknown",
          name: "A node that is not in the graph",
          code: `assert reachable(["a"], [], "ghost") == []`,
        },
        {
          id: "cycle",
          name: "A cycle does not loop forever",
          description: "Marking nodes as seen is what terminates the walk.",
          code: `got = reachable(["a", "b", "c"], [["a", "b"], ["b", "c"], ["c", "a"]], "a")
assert got == ["a", "b", "c"], f"got {got}"`,
        },
      ],
    },
    {
      title: "Measure the shortest path",
      short: "Distance",
      solutionNote: [
        "Breadth-first search reaches every node by its shortest route, so carrying a distance alongside the queue is enough — there is never a need to compare two paths. A depth-first walk would find ",
        { code: "a" },
        " path and cheerfully report the wrong length.",
      ],
      signature:
        "def shortest_path_length(nodes: list[str], edges: list[list[str]], start: str, goal: str) -> int",
      prompt: [
        [
          "Return the number of edges on the shortest path from ",
          { code: "start" },
          " to ",
          { code: "goal" },
          ", or ",
          { code: "-1" },
          " when there is no path. A node is zero edges from itself.",
        ],
        [
          "Breadth-first search reaches every node by its shortest route, so carrying a distance alongside the queue is enough — no need to compare paths. A depth-first walk would find ",
          { code: "a" },
          " path, but not the shortest one.",
        ],
      ],
      starter: `${REACHABLE}

def shortest_path_length(nodes: list[str], edges: list[list[str]], start: str, goal: str) -> int:
    if start == goal:
        return 0 if start in nodes else -1
    adjacency = build_adjacency(nodes, edges)
    # Carry a distance alongside the walk.
    return -1
`,
      solution: `${REACHABLE}

def shortest_path_length(nodes: list[str], edges: list[list[str]], start: str, goal: str) -> int:
    if start == goal:
        return 0 if start in nodes else -1
    adjacency = build_adjacency(nodes, edges)
    if start not in adjacency or goal not in adjacency:
        return -1
    distance = {start: 0}
    queue = [start]
    while queue:
        node = queue.pop(0)
        for nxt in adjacency[node]:
            if nxt not in distance:
                distance[nxt] = distance[node] + 1
                if nxt == goal:
                    return distance[nxt]
                queue.append(nxt)
    return -1
`,
      tests: [
        {
          id: "chain",
          name: "A chain of three",
          code: `got = shortest_path_length(["a", "b", "c"], [["a", "b"], ["b", "c"]], "a", "c")
assert got == 2, f"got {got}"`,
        },
        {
          id: "shortcut",
          name: "The shortest route wins",
          description: "A depth-first walk could return 3 here.",
          code: `nodes = ["a", "b", "c", "d"]
edges = [["a", "b"], ["b", "c"], ["c", "d"], ["a", "d"]]
got = shortest_path_length(nodes, edges, "a", "d")
assert got == 1, f"got {got}"`,
        },
        {
          id: "self",
          name: "A node is zero from itself",
          code: `assert shortest_path_length(["a"], [], "a", "a") == 0`,
        },
        {
          id: "unreachable",
          name: "No path at all",
          code: `got = shortest_path_length(["a", "b", "x"], [["a", "b"]], "a", "x")
assert got == -1, f"got {got}"`,
        },
        {
          id: "unknown",
          name: "A node that is not in the graph",
          code: `assert shortest_path_length(["a"], [], "a", "ghost") == -1
assert shortest_path_length(["a"], [], "ghost", "ghost") == -1`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert build_adjacency(["a", "b"], [["a", "b"]]) == {"a": ["b"], "b": ["a"]}
assert reachable(["a", "b"], [["a", "b"]], "a") == ["a", "b"]`,
        },
      ],
    },
  ],
);

export const CODE_MULTI_PYTHON_TOOLS: Challenge[] = [
  MARKDOWN_TABLE,
  ROMAN_NUMERALS,
  INVENTORY_DIFF,
  GRAPH_SEARCH,
];
