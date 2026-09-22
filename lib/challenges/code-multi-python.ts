/**
 * Multi-step Python challenges.
 *
 * A step rail suits a build rather than a puzzle: each step adds one function
 * to a program that keeps growing, and the step the learner is on is the only
 * thing they have to hold in their head. That is why every step's starter here
 * is literally the previous step's accepted solution plus a stub — the code
 * that already passed is on screen, working, and nobody retypes it.
 *
 * Those shared programs are constants rather than copied strings, so fixing a
 * bug in step 1 cannot leave step 3 quoting a version that no longer exists.
 * `__tests__/challengeSolutions` runs every step's solution under `python3`
 * with the real harness.
 */

import { codeSteps } from "./authoring";
import type { Challenge } from "./types";

// ─── Word Frequency Pipeline ─────────────────────────────────────────

const TOKENIZE = `import re


def tokenize(text: str) -> list[str]:
    return re.findall("[a-z]+", text.lower())
`;

const COUNT_WORDS = `${TOKENIZE}

def count_words(text: str) -> dict[str, int]:
    counts = {}
    for word in tokenize(text):
        counts[word] = counts.get(word, 0) + 1
    return counts
`;

const WORD_FREQUENCY_PIPELINE = codeSteps(
  {
    slug: "word-frequency-pipeline",
    title: "Word Frequency Pipeline",
    difficulty: "Intermediate",
    topic: "Text processing",
    language: "python",
    description:
      "Build a word-frequency report in three stages: split text into words, count them, then format the top few.",
    solutionNote: [
      "Splitting the work at the seams — tokenize, count, format — is what makes each piece testable on its own. It is also what lets you swap the tokenizer for one that keeps hyphens, or the formatter for JSON, without touching the other two.",
    ],
  },
  [
    {
      title: "Split text into words",
      short: "Tokenize",
      solutionNote: [
        "Lowercasing before the match rather than after is what keeps the pattern to a single character class. The regular expression is also the specification: it says a word is letters and nothing else, so digits and apostrophes are separators by definition rather than by accident.",
      ],
      signature: "def tokenize(text: str) -> list[str]",
      prompt: [
        [
          "Turn a block of text into a list of lowercase words. A word is a run of letters: anything else — punctuation, digits, whitespace — separates words and is thrown away.",
        ],
        [
          "A regular expression does this in one line. ",
          { code: 're.findall("[a-z]+", text.lower())' },
          " lowercases first so the pattern only has to handle one case.",
        ],
      ],
      starter: `import re


def tokenize(text: str) -> list[str]:
    # Every run of letters is a word; everything else is a separator.
    return []
`,
      solution: TOKENIZE,
      tests: [
        {
          id: "punctuation",
          name: "Punctuation separates words",
          code: `got = tokenize("The quick, brown fox!")
assert got == ["the", "quick", "brown", "fox"], f"got {got}"`,
        },
        {
          id: "lowercase",
          name: "Words come back lowercased",
          code: `assert tokenize("AAA Bbb") == ["aaa", "bbb"], f"got {tokenize('AAA Bbb')}"`,
        },
        {
          id: "hyphen",
          name: "A hyphen splits a word in two",
          code: `assert tokenize("Hello-World") == ["hello", "world"], \\
    f"got {tokenize('Hello-World')}"`,
        },
        {
          id: "digits",
          name: "Digits are separators, not letters",
          code: `assert tokenize("a1b") == ["a", "b"], f"got {tokenize('a1b')}"`,
        },
        {
          id: "empty",
          name: "Empty text has no words",
          code: `assert tokenize("") == []
assert tokenize("... !!!") == []`,
        },
      ],
    },
    {
      title: "Count the words",
      short: "Count",
      solutionNote: [
        { code: "counts.get(word, 0) + 1" },
        " is the idiom worth internalising — it handles the first sighting of a word without a membership test. ",
        { code: "collections.Counter" },
        " does the same thing in one call, and is what you would reach for outside an exercise.",
      ],
      signature: "def count_words(text: str) -> dict[str, int]",
      prompt: [
        [
          "Add ",
          { code: "count_words" },
          ", which tokenizes the text and returns a dictionary of word to how many times it appears.",
        ],
        [
          "Keep ",
          { code: "tokenize" },
          " exactly as it is — the new function calls it rather than repeating the regular expression.",
        ],
      ],
      starter: `${TOKENIZE}

def count_words(text: str) -> dict[str, int]:
    counts = {}
    # Tokenize, then tally.
    return counts
`,
      solution: COUNT_WORDS,
      tests: [
        {
          id: "counts",
          name: "Repeated words are tallied",
          code: `got = count_words("the cat the hat the")
assert got == {"the": 3, "cat": 1, "hat": 1}, f"got {got}"`,
        },
        {
          id: "case",
          name: "Case is folded before counting",
          code: `assert count_words("Cat cat CAT") == {"cat": 3}, f"got {count_words('Cat cat CAT')}"`,
        },
        {
          id: "empty",
          name: "Empty text counts nothing",
          code: `assert count_words("") == {}`,
        },
        {
          id: "uses-tokenize",
          name: "Still built on tokenize",
          description: "Step 1's function must survive step 2.",
          code: `assert tokenize("Hi there") == ["hi", "there"]`,
        },
      ],
    },
    {
      title: "Format the report",
      short: "Report",
      solutionNote: [
        "Sorting by a tuple is what makes the tiebreak part of the key rather than a second pass: ",
        { code: "(-counts[word], word)" },
        ' reads as "most frequent first, then alphabetical". Negating the count is the trick that gets a descending sort out of an ascending one without sorting twice.',
      ],
      signature: "def report(text: str, n: int) -> list[str]",
      prompt: [
        [
          "Finish the pipeline with ",
          { code: "report" },
          ", which returns the ",
          { code: "n" },
          " most frequent words as ",
          { code: '"word: count"' },
          " strings, most frequent first.",
        ],
        "Words that appear the same number of times come out in alphabetical order. Asking for more words than the text contains simply returns everything.",
      ],
      starter: `${COUNT_WORDS}

def report(text: str, n: int) -> list[str]:
    counts = count_words(text)
    # Most frequent first, ties alphabetical, then format.
    return []
`,
      solution: `${COUNT_WORDS}

def report(text: str, n: int) -> list[str]:
    counts = count_words(text)
    ranked = sorted(counts, key=lambda word: (-counts[word], word))
    return [word + ": " + str(counts[word]) for word in ranked[:n]]
`,
      tests: [
        {
          id: "top-two",
          name: "The two most frequent words",
          code: `got = report("the cat the hat the mat", 2)
assert got == ["the: 3", "cat: 1"], f"got {got}"`,
        },
        {
          id: "ties",
          name: "Ties come out alphabetically",
          code: `got = report("b a c", 3)
assert got == ["a: 1", "b: 1", "c: 1"], f"got {got}"`,
        },
        {
          id: "over-ask",
          name: "Asking for more words than there are",
          code: `got = report("solo", 10)
assert got == ["solo: 1"], f"got {got}"`,
        },
        {
          id: "empty",
          name: "Empty text reports nothing",
          code: `assert report("", 5) == []`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert tokenize("One two") == ["one", "two"]
assert count_words("one one") == {"one": 2}`,
        },
      ],
    },
  ],
);

// ─── CSV Report Builder ──────────────────────────────────────────────

const CSV_PARSE = `def parse(rows: list[str]) -> list[dict]:
    if len(rows) < 2:
        return []
    header = [name.strip() for name in rows[0].split(",")]
    records = []
    for line in rows[1:]:
        cells = [cell.strip() for cell in line.split(",")]
        records.append(dict(zip(header, cells)))
    return records
`;

const CSV_TOTALS = `${CSV_PARSE}

def total_by(records: list[dict], group_col: str, value_col: str) -> dict[str, float]:
    totals = {}
    for record in records:
        group = record[group_col]
        cell = record[value_col].strip()
        totals[group] = round(totals.get(group, 0.0) + (float(cell) if cell else 0.0), 2)
    return totals
`;

const CSV_REPORT_BUILDER = codeSteps(
  {
    slug: "csv-report-builder",
    title: "CSV Report Builder",
    difficulty: "Intermediate",
    topic: "Parsing",
    language: "python",
    description:
      "Go from raw CSV lines to a ranked summary: parse into records, total one column by another, then format.",
    solutionNote: [
      "Parsing into dictionaries first is what makes the aggregation readable: ",
      { code: 'record["category"]' },
      " says what it means, where ",
      { code: "cells[2]" },
      " does not. It is the same reason a warehouse loads raw files into typed columns before anyone writes a report against them.",
    ],
  },
  [
    {
      title: "Parse the rows",
      short: "Parse",
      solutionNote: [
        { code: "zip(header, cells)" },
        " pairs the two lists positionally and stops at the shorter one, which is why a short row loses its trailing fields rather than raising. Parsing into dictionaries first is what makes step 2 readable: ",
        { code: 'record["category"]' },
        " says what it means where ",
        { code: "cells[2]" },
        " does not.",
      ],
      signature: "def parse(rows: list[str]) -> list[dict]",
      prompt: [
        "The first line is the header. Turn every line after it into a dictionary keyed by the header's column names.",
        [
          "Strip whitespace from names and values. A CSV with no data rows — or no rows at all — parses to an empty list. Cells contain no quoted commas, so ",
          { code: 'line.split(",")' },
          " is enough.",
        ],
      ],
      starter: `def parse(rows: list[str]) -> list[dict]:
    if len(rows) < 2:
        return []
    header = [name.strip() for name in rows[0].split(",")]
    # One dictionary per data row, keyed by the header.
    return []
`,
      solution: CSV_PARSE,
      tests: [
        {
          id: "basic",
          name: "Two data rows become two records",
          code: `got = parse(["item,category,amount", "mug,kitchen,7.50", "pen,office,1.25"])
assert got == [
    {"item": "mug", "category": "kitchen", "amount": "7.50"},
    {"item": "pen", "category": "office", "amount": "1.25"},
], f"got {got}"`,
        },
        {
          id: "whitespace",
          name: "Whitespace is stripped",
          code: `got = parse(["a, b", "1, 2"])
assert got == [{"a": "1", "b": "2"}], f"got {got}"`,
        },
        {
          id: "header-only",
          name: "A header with no data rows",
          code: `assert parse(["a,b"]) == []`,
        },
        {
          id: "empty",
          name: "No rows at all",
          code: `assert parse([]) == []`,
        },
      ],
    },
    {
      title: "Total one column by another",
      short: "Total",
      solutionNote: [
        "This is a GROUP BY written by hand, and the shape is the same one SQL uses: one entry per distinct group, each holding a running total. Guarding the blank cell before converting it is what keeps a real-world CSV from raising halfway through the file.",
      ],
      signature:
        "def total_by(records: list[dict], group_col: str, value_col: str) -> dict[str, float]",
      prompt: [
        [
          "Add ",
          { code: "total_by" },
          ", which takes the records from step 1 and returns a dictionary of group to the total of the value column, rounded to 2 decimal places.",
        ],
        "Blank values count as zero. This is a GROUP BY, written by hand.",
      ],
      starter: `${CSV_PARSE}

def total_by(records: list[dict], group_col: str, value_col: str) -> dict[str, float]:
    totals = {}
    # One entry per distinct group, holding the running total.
    return totals
`,
      solution: CSV_TOTALS,
      tests: [
        {
          id: "groups",
          name: "Rows are totalled by group",
          code: `records = parse([
    "item,category,amount",
    "mug,kitchen,7.50",
    "pan,kitchen,2.50",
    "pen,office,1.25",
])
got = total_by(records, "category", "amount")
assert got == {"kitchen": 10.0, "office": 1.25}, f"got {got}"`,
        },
        {
          id: "blank",
          name: "Blank values count as zero",
          code: `records = parse(["g,v", "a,", "a,3"])
assert total_by(records, "g", "v") == {"a": 3.0}, f"got {total_by(records, 'g', 'v')}"`,
        },
        {
          id: "empty",
          name: "No records, no groups",
          code: `assert total_by([], "g", "v") == {}`,
        },
        {
          id: "rounding",
          name: "Totals are rounded to 2 places",
          code: `records = parse(["g,v", "a,0.1", "a,0.2"])
assert total_by(records, "g", "v") == {"a": 0.3}, f"got {total_by(records, 'g', 'v')}"`,
        },
      ],
    },
    {
      title: "Format the report",
      short: "Report",
      solutionNote: [
        { code: 'format(total, ".2f")' },
        " rather than ",
        { code: "str(total)" },
        ' is what stops a total of 10.0 printing as "10.0" in a column of two-decimal money. Composing the three functions rather than reimplementing them is the point of having split them.',
      ],
      signature:
        "def report(rows: list[str], group_col: str, value_col: str) -> list[str]",
      prompt: [
        [
          "Tie it together: ",
          { code: "report" },
          " parses the rows, totals them, and returns ",
          { code: '"group: total"' },
          " strings with the largest total first.",
        ],
        [
          "Groups with equal totals come out alphabetically. Format the total with ",
          { code: 'f"{total:.2f}"' },
          " so every line shows two decimal places.",
        ],
      ],
      starter: `${CSV_TOTALS}

def report(rows: list[str], group_col: str, value_col: str) -> list[str]:
    totals = total_by(parse(rows), group_col, value_col)
    # Largest total first, ties alphabetical, two decimal places.
    return []
`,
      solution: `${CSV_TOTALS}

def report(rows: list[str], group_col: str, value_col: str) -> list[str]:
    totals = total_by(parse(rows), group_col, value_col)
    ranked = sorted(totals, key=lambda group: (-totals[group], group))
    return [group + ": " + format(totals[group], ".2f") for group in ranked]
`,
      tests: [
        {
          id: "ranked",
          name: "Largest total first",
          code: `rows = [
    "item,category,amount",
    "mug,kitchen,7.50",
    "pan,kitchen,2.50",
    "pen,office,1.25",
]
got = report(rows, "category", "amount")
assert got == ["kitchen: 10.00", "office: 1.25"], f"got {got}"`,
        },
        {
          id: "ties",
          name: "Equal totals come out alphabetically",
          code: `rows = ["g,v", "b,5", "a,5"]
assert report(rows, "g", "v") == ["a: 5.00", "b: 5.00"], f"got {report(rows, 'g', 'v')}"`,
        },
        {
          id: "empty",
          name: "A header with no data rows",
          code: `assert report(["g,v"], "g", "v") == []`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert parse(["a,b", "1,2"]) == [{"a": "1", "b": "2"}]
assert total_by([{"g": "x", "v": "2"}], "g", "v") == {"x": 2.0}`,
        },
      ],
    },
  ],
);

// ─── RPN Calculator ──────────────────────────────────────────────────

const RPN_OPERATORS = `OPERATORS = ("+", "-", "*", "/")


def tokenize(expression: str) -> list:
    tokens = []
    for token in expression.split():
        tokens.append(token if token in OPERATORS else int(token))
    return tokens
`;

const RPN_EVALUATE = `${RPN_OPERATORS}

def evaluate(expression: str):
    stack = []
    for token in tokenize(expression):
        if token in OPERATORS:
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            else:
                stack.append(left / right)
        else:
            stack.append(token)
    return stack[-1]
`;

const RPN_CALCULATOR = codeSteps(
  {
    slug: "rpn-calculator",
    title: "RPN Calculator",
    difficulty: "Intermediate",
    topic: "Stacks",
    language: "python",
    description:
      "Evaluate postfix arithmetic with a stack: tokenize the expression, run the operators, then reject malformed input.",
    solutionNote: [
      "Postfix needs no precedence rules and no parentheses, which is why a stack is all it takes: operands pile up, and an operator consumes the top two. The ordering trap is subtraction and division — the first value popped is the ",
      { code: "right" },
      " operand, so popping into ",
      { code: "left" },
      " first would compute the expression backwards.",
    ],
  },
  [
    {
      title: "Tokenize the expression",
      short: "Tokenize",
      solutionNote: [
        "Checking for an exact match against the operator list, rather than testing the first character, is what keeps ",
        { code: '"-2"' },
        " a number. It is the kind of shortcut that works on every input you think of and fails on the first negative literal.",
      ],
      signature: "def tokenize(expression: str) -> list",
      prompt: [
        [
          "Split a space-separated postfix expression into tokens: operators stay as strings, everything else becomes an ",
          { code: "int" },
          ".",
        ],
        [
          "The four operators are ",
          { code: "+ - * /" },
          ". A negative number like ",
          { code: '"-2"' },
          " is a number, not an operator — check for an exact match against the operator list rather than a leading character.",
        ],
      ],
      starter: `OPERATORS = ("+", "-", "*", "/")


def tokenize(expression: str) -> list:
    tokens = []
    for token in expression.split():
        # Operators stay text; everything else is a number.
        pass
    return tokens
`,
      solution: RPN_OPERATORS,
      tests: [
        {
          id: "basic",
          name: "Numbers become integers",
          code: `assert tokenize("3 4 +") == [3, 4, "+"], f"got {tokenize('3 4 +')}"`,
        },
        {
          id: "negative",
          name: "A negative number is not an operator",
          code: `assert tokenize("-2 5 *") == [-2, 5, "*"], f"got {tokenize('-2 5 *')}"`,
        },
        {
          id: "all-operators",
          name: "All four operators survive as text",
          code: `assert tokenize("+ - * /") == ["+", "-", "*", "/"], f"got {tokenize('+ - * /')}"`,
        },
        {
          id: "empty",
          name: "An empty expression has no tokens",
          code: `assert tokenize("") == []
assert tokenize("   ") == []`,
        },
      ],
    },
    {
      title: "Evaluate with a stack",
      short: "Evaluate",
      solutionNote: [
        "Postfix needs no precedence rules and no parentheses, which is why a stack is all it takes. The ordering trap is subtraction and division: the first value popped is the ",
        { code: "right" },
        " operand, so popping into ",
        { code: "left" },
        " first computes the expression backwards.",
      ],
      signature: "def evaluate(expression: str)",
      prompt: [
        [
          "Add ",
          { code: "evaluate" },
          ". Push numbers onto a stack; when an operator arrives, pop two values, apply it, and push the result. The answer is what is left on the stack.",
        ],
        [
          "Watch the order: the ",
          { code: "first" },
          " value popped is the right-hand operand, so ",
          { code: '"2 3 -"' },
          " is ",
          { code: "2 - 3" },
          ". Division is ordinary ",
          { code: "/" },
          ", so it yields a float.",
        ],
      ],
      starter: `${RPN_OPERATORS}

def evaluate(expression: str):
    stack = []
    for token in tokenize(expression):
        # Numbers pile up; an operator consumes the top two.
        pass
    return stack[-1]
`,
      solution: RPN_EVALUATE,
      tests: [
        {
          id: "add",
          name: "A single operation",
          code: `assert evaluate("3 4 +") == 7, f"got {evaluate('3 4 +')}"`,
        },
        {
          id: "order",
          name: "Subtraction respects operand order",
          description: "The first value popped is the right-hand side.",
          code: `assert evaluate("2 3 -") == -1, f"got {evaluate('2 3 -')}"`,
        },
        {
          id: "nested",
          name: "A nested expression",
          description: "5 + ((1 + 2) * 4) - 3",
          code: `assert evaluate("5 1 2 + 4 * + 3 -") == 14, f"got {evaluate('5 1 2 + 4 * + 3 -')}"`,
        },
        {
          id: "division",
          name: "Division yields a float",
          code: `assert evaluate("6 3 /") == 2.0, f"got {evaluate('6 3 /')}"`,
        },
        {
          id: "single",
          name: "A lone number evaluates to itself",
          code: `assert evaluate("42") == 42`,
        },
      ],
    },
    {
      title: "Reject malformed input",
      short: "Errors",
      solutionNote: [
        "Every bad expression leaving as the same exception type is what makes this usable by a caller. A stray ",
        { code: "IndexError" },
        " from an empty stack or a ",
        { code: "ZeroDivisionError" },
        " from the divide are implementation details leaking out — the caller cannot reasonably be asked to catch them.",
      ],
      signature: "def evaluate(expression: str)",
      prompt: [
        [
          "Real input is not always well formed. Raise ",
          { code: "ValueError" },
          " when an operator has fewer than two operands, when values are left over at the end, when the expression is empty, and when a division by zero is attempted.",
        ],
        [
          "A stray ",
          { code: "ZeroDivisionError" },
          " or ",
          { code: "IndexError" },
          " escaping the function counts as a failure — every bad expression must come back as a ",
          { code: "ValueError" },
          ".",
        ],
      ],
      starter: `${RPN_EVALUATE}`,
      solution: `${RPN_OPERATORS}

def evaluate(expression: str):
    stack = []
    for token in tokenize(expression):
        if token in OPERATORS:
            if len(stack) < 2:
                raise ValueError("not enough operands for " + token)
            right = stack.pop()
            left = stack.pop()
            if token == "+":
                stack.append(left + right)
            elif token == "-":
                stack.append(left - right)
            elif token == "*":
                stack.append(left * right)
            else:
                if right == 0:
                    raise ValueError("division by zero")
                stack.append(left / right)
        else:
            stack.append(token)
    if len(stack) != 1:
        raise ValueError("malformed expression")
    return stack[0]
`,
      tests: [
        {
          id: "still-works",
          name: "Valid expressions still evaluate",
          code: `assert evaluate("5 1 2 + 4 * + 3 -") == 14
assert evaluate("6 3 /") == 2.0`,
        },
        {
          id: "too-few",
          name: "An operator without enough operands",
          code: `try:
    evaluate("3 +")
    raise AssertionError("expected ValueError")
except ValueError:
    pass`,
        },
        {
          id: "left-over",
          name: "Values left on the stack",
          code: `try:
    evaluate("1 2 3 +")
    raise AssertionError("expected ValueError")
except ValueError:
    pass`,
        },
        {
          id: "empty",
          name: "An empty expression",
          code: `try:
    evaluate("")
    raise AssertionError("expected ValueError")
except ValueError:
    pass`,
        },
        {
          id: "divide-by-zero",
          name: "Division by zero is a ValueError",
          description: "Not a ZeroDivisionError escaping the function.",
          code: `try:
    evaluate("1 0 /")
    raise AssertionError("expected ValueError")
except ZeroDivisionError:
    raise AssertionError("ZeroDivisionError escaped; raise ValueError instead")
except ValueError:
    pass`,
        },
      ],
    },
  ],
);

// ─── Binary Search Tree ──────────────────────────────────────────────

const BST_INSERT = `def insert(node: dict | None, value: int) -> dict:
    if node is None:
        return {"value": value, "left": None, "right": None}
    if value < node["value"]:
        node["left"] = insert(node["left"], value)
    elif value > node["value"]:
        node["right"] = insert(node["right"], value)
    return node
`;

const BST_CONTAINS = `${BST_INSERT}

def contains(node: dict | None, value: int) -> bool:
    if node is None:
        return False
    if value == node["value"]:
        return True
    if value < node["value"]:
        return contains(node["left"], value)
    return contains(node["right"], value)
`;

const BINARY_SEARCH_TREE = codeSteps(
  {
    slug: "binary-search-tree",
    title: "Binary Search Tree",
    difficulty: "Advanced",
    topic: "Trees",
    language: "python",
    description:
      "Build a search tree from nothing: insert values in order, look them up, then walk the tree to read them back sorted.",
    solutionNote: [
      "Every function here is the same three-line shape — handle the empty node, compare, recurse left or right — because that invariant (everything left is smaller, everything right is larger) is the only thing a BST guarantees. Notice what falls out of it: an in-order walk returns the values sorted without ever calling ",
      { code: "sorted" },
      ".",
    ],
  },
  [
    {
      title: "Insert a value",
      short: "Insert",
      solutionNote: [
        "Returning the node rather than mutating in place is what makes the empty case work: inserting into ",
        { code: "None" },
        " has nothing to attach to, so the new node has to travel back up to whoever called. That single decision removes every special case around the root.",
      ],
      signature: "def insert(node: dict | None, value: int) -> dict",
      prompt: [
        [
          "A node is a dictionary: ",
          { code: '{"value": v, "left": None, "right": None}' },
          ". Write ",
          { code: "insert" },
          ", which returns the root of the tree with the value added.",
        ],
        [
          "Smaller values go left, larger go right, and a value already in the tree changes nothing. Inserting into ",
          { code: "None" },
          " creates a new node — which is what makes the recursion terminate.",
        ],
      ],
      starter: `def insert(node: dict | None, value: int) -> dict:
    if node is None:
        return {"value": value, "left": None, "right": None}
    # Smaller goes left, larger goes right, equal changes nothing.
    return node
`,
      solution: BST_INSERT,
      tests: [
        {
          id: "root",
          name: "Inserting into an empty tree",
          code: `root = insert(None, 5)
assert root == {"value": 5, "left": None, "right": None}, f"got {root}"`,
        },
        {
          id: "sides",
          name: "Smaller left, larger right",
          code: `root = insert(insert(insert(None, 5), 3), 8)
assert root["left"]["value"] == 3, f"got {root['left']}"
assert root["right"]["value"] == 8, f"got {root['right']}"`,
        },
        {
          id: "depth",
          name: "A value two levels down",
          code: `root = None
for value in [5, 3, 4]:
    root = insert(root, value)
assert root["left"]["right"]["value"] == 4, f"got {root}"`,
        },
        {
          id: "duplicate",
          name: "A duplicate changes nothing",
          code: `root = insert(insert(None, 5), 5)
assert root["left"] is None and root["right"] is None, f"got {root}"`,
        },
      ],
    },
    {
      title: "Look a value up",
      short: "Contains",
      solutionNote: [
        "The same comparison that decided where to put a value decides where to look for it, so only one branch is ever searched. That is the entire value of the tree: on a balanced one it is O(log n), and on the degenerate tree that inserting sorted data produces it degrades to a linked list.",
      ],
      signature: "def contains(node: dict | None, value: int) -> bool",
      prompt: [
        [
          "Add ",
          { code: "contains" },
          ", which reports whether a value is anywhere in the tree.",
        ],
        "The same comparison that decided where to insert decides where to look, so only one branch is ever searched. On a balanced tree that is O(log n).",
      ],
      starter: `${BST_INSERT}

def contains(node: dict | None, value: int) -> bool:
    if node is None:
        return False
    # Compare, then search only the side it could be on.
    return False
`,
      solution: BST_CONTAINS,
      tests: [
        {
          id: "present",
          name: "Values that are there",
          code: `root = None
for value in [5, 3, 8, 4]:
    root = insert(root, value)
for value in [5, 3, 8, 4]:
    assert contains(root, value) is True, f"{value} should be found"`,
        },
        {
          id: "absent",
          name: "A value that is not there",
          code: `root = None
for value in [5, 3, 8]:
    root = insert(root, value)
assert contains(root, 7) is False`,
        },
        {
          id: "empty",
          name: "An empty tree contains nothing",
          code: `assert contains(None, 1) is False`,
        },
        {
          id: "deep",
          name: "A long right spine",
          description: "Inserting in order makes the tree a list.",
          code: `root = None
for value in range(100):
    root = insert(root, value)
assert contains(root, 99) is True
assert contains(root, 100) is False`,
        },
      ],
    },
    {
      title: "Read the tree back sorted",
      short: "Traverse",
      solutionNote: [
        "Left, then the node, then right. Because everything on the left is smaller and everything on the right is larger, that walk produces the values in ascending order — sorted output with no call to ",
        { code: "sorted" },
        " anywhere, which is the invariant paying for itself.",
      ],
      signature: "def in_order(node: dict | None) -> list[int]",
      prompt: [
        [
          "Add ",
          { code: "in_order" },
          ", which returns every value in the tree as a list.",
        ],
        [
          "Visit the left subtree, then the node, then the right subtree. Because of the ordering invariant, that walk produces the values in ascending order — no call to ",
          { code: "sorted" },
          " anywhere.",
        ],
      ],
      starter: `${BST_CONTAINS}

def in_order(node: dict | None) -> list[int]:
    if node is None:
        return []
    # Left subtree, this value, right subtree.
    return []
`,
      solution: `${BST_CONTAINS}

def in_order(node: dict | None) -> list[int]:
    if node is None:
        return []
    return in_order(node["left"]) + [node["value"]] + in_order(node["right"])
`,
      tests: [
        {
          id: "sorted",
          name: "Values come out sorted",
          code: `root = None
for value in [5, 3, 8, 1, 4, 7, 9]:
    root = insert(root, value)
got = in_order(root)
assert got == [1, 3, 4, 5, 7, 8, 9], f"got {got}"`,
        },
        {
          id: "empty",
          name: "An empty tree",
          code: `assert in_order(None) == []`,
        },
        {
          id: "single",
          name: "A single node",
          code: `assert in_order(insert(None, 42)) == [42]`,
        },
        {
          id: "duplicates",
          name: "Duplicates appear once",
          code: `root = None
for value in [2, 1, 2, 3, 1]:
    root = insert(root, value)
assert in_order(root) == [1, 2, 3], f"got {in_order(root)}"`,
        },
        {
          id: "earlier-steps",
          name: "Insert and contains still work",
          code: `root = insert(insert(None, 5), 3)
assert contains(root, 3) is True
assert contains(root, 4) is False`,
        },
      ],
    },
  ],
);

// ─── LRU Cache ───────────────────────────────────────────────────────

const LRU_STORE = `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.entries = {}

    def get(self, key):
        return self.entries.get(key, -1)

    def put(self, key, value) -> None:
        self.entries[key] = value
`;

const LRU_EVICT = `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.entries = {}

    def get(self, key):
        return self.entries.get(key, -1)

    def put(self, key, value) -> None:
        if key in self.entries:
            del self.entries[key]
        self.entries[key] = value
        if len(self.entries) > self.capacity:
            oldest = next(iter(self.entries))
            del self.entries[oldest]
`;

const LRU_CACHE = codeSteps(
  {
    slug: "lru-cache",
    title: "LRU Cache",
    difficulty: "Advanced",
    topic: "Data structures",
    language: "python",
    description:
      "Build a fixed-size cache one rule at a time: store and fetch, then evict the oldest, then let a read count as use.",
    solutionNote: [
      "A Python dictionary preserves insertion order, which is most of an LRU for free: the oldest key is the first one ",
      { code: "iter" },
      " yields. The work is keeping that order honest — deleting and re-inserting a key on every use is what moves it to the back, and doing it on reads as well as writes is the difference between least-recently-*inserted* and least-recently-*used*.",
    ],
  },
  [
    {
      title: "Store and fetch",
      short: "Store",
      solutionNote: [
        "Returning ",
        { code: "-1" },
        " for a miss rather than raising is a deliberate interface choice: a cache miss is an ordinary outcome, not an error, and a caller that has to wrap every read in a try block will eventually stop checking.",
      ],
      signature:
        "class LRUCache:  # __init__(capacity), get(key), put(key, value)",
      prompt: [
        [
          "Start with the plain map. ",
          { code: "put" },
          " stores a value, ",
          { code: "get" },
          " returns it, and ",
          { code: "get" },
          " on a key that was never stored returns ",
          { code: "-1" },
          ".",
        ],
        "Ignore the capacity for now — step 2 puts it to work. Storing a key twice replaces the value.",
      ],
      starter: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.entries = {}

    def get(self, key):
        # Missing keys report -1 rather than raising.
        return -1

    def put(self, key, value) -> None:
        pass
`,
      solution: LRU_STORE,
      tests: [
        {
          id: "roundtrip",
          name: "A value comes back out",
          code: `cache = LRUCache(2)
cache.put("a", 1)
assert cache.get("a") == 1, f"got {cache.get('a')}"`,
        },
        {
          id: "missing",
          name: "A key that was never stored",
          code: `assert LRUCache(2).get("nope") == -1`,
        },
        {
          id: "overwrite",
          name: "Storing a key twice replaces the value",
          code: `cache = LRUCache(2)
cache.put("a", 1)
cache.put("a", 2)
assert cache.get("a") == 2, f"got {cache.get('a')}"`,
        },
        {
          id: "several",
          name: "Several keys at once",
          code: `cache = LRUCache(3)
for key, value in [("a", 1), ("b", 2), ("c", 3)]:
    cache.put(key, value)
assert [cache.get(k) for k in "abc"] == [1, 2, 3]`,
        },
      ],
    },
    {
      title: "Evict the oldest",
      short: "Evict",
      solutionNote: [
        "A Python dictionary preserves insertion order, which is most of an LRU for free — the oldest key is the first one ",
        { code: "iter" },
        " yields. Deleting before re-inserting an existing key is what moves it to the back; assigning to it in place leaves the order untouched.",
      ],
      signature: "def put(self, key, value) -> None",
      prompt: [
        [
          "Now hold the cache to its capacity. When a ",
          { code: "put" },
          " takes it past ",
          { code: "capacity" },
          " entries, drop the one that has been there longest.",
        ],
        [
          "A Python dictionary keeps insertion order, so the oldest key is ",
          { code: "next(iter(self.entries))" },
          ". Re-storing an existing key should move it to the back, not leave it where it was.",
        ],
      ],
      starter: `${LRU_STORE}`,
      solution: LRU_EVICT,
      tests: [
        {
          id: "evicts",
          name: "The third key pushes out the first",
          code: `cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.put("c", 3)
assert cache.get("a") == -1, "a should have been evicted"
assert cache.get("b") == 2 and cache.get("c") == 3`,
        },
        {
          id: "within-capacity",
          name: "Nothing is dropped below capacity",
          code: `cache = LRUCache(3)
for key, value in [("a", 1), ("b", 2), ("c", 3)]:
    cache.put(key, value)
assert [cache.get(k) for k in "abc"] == [1, 2, 3]`,
        },
        {
          id: "refresh-on-write",
          name: "Re-storing a key moves it to the back",
          code: `cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.put("a", 3)
cache.put("c", 4)
assert cache.get("b") == -1, "b was the oldest and should have gone"
assert cache.get("a") == 3, f"got {cache.get('a')}"`,
        },
        {
          id: "capacity-one",
          name: "A cache that holds one entry",
          code: `cache = LRUCache(1)
cache.put("a", 1)
cache.put("b", 2)
assert cache.get("a") == -1
assert cache.get("b") == 2`,
        },
      ],
    },
    {
      title: "A read counts as use",
      short: "Refresh",
      solutionNote: [
        "This one line is the whole difference between a FIFO cache and an LRU one. Refreshing on reads as well as writes is what lets a hot key survive indefinitely, no matter how long ago it was first stored — which is the behaviour anyone asking for an LRU actually wants.",
      ],
      signature: "def get(self, key)",
      prompt: [
        [
          "Right now the cache evicts the least recently ",
          { code: "written" },
          ". Make it evict the least recently ",
          { code: "used" },
          ": a successful ",
          { code: "get" },
          " must move its key to the back too.",
        ],
        "That is the whole difference between a FIFO cache and an LRU one, and it is the reason a hot key survives however long it has been in the cache.",
      ],
      starter: `${LRU_EVICT}`,
      solution: `class LRUCache:
    def __init__(self, capacity: int):
        self.capacity = capacity
        self.entries = {}

    def get(self, key):
        if key not in self.entries:
            return -1
        value = self.entries.pop(key)
        self.entries[key] = value
        return value

    def put(self, key, value) -> None:
        if key in self.entries:
            del self.entries[key]
        self.entries[key] = value
        if len(self.entries) > self.capacity:
            oldest = next(iter(self.entries))
            del self.entries[oldest]
`,
      tests: [
        {
          id: "read-refreshes",
          name: "Reading a key saves it from eviction",
          code: `cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.get("a")
cache.put("c", 3)
assert cache.get("b") == -1, "b was least recently used and should have gone"
assert cache.get("a") == 1, f"got {cache.get('a')}"`,
        },
        {
          id: "miss-no-refresh",
          name: "A missing key changes nothing",
          code: `cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.get("zzz")
cache.put("c", 3)
assert cache.get("a") == -1, "a should still have been the oldest"`,
        },
        {
          id: "hot-key",
          name: "A hot key survives indefinitely",
          code: `cache = LRUCache(2)
cache.put("hot", 1)
for i in range(50):
    cache.put("cold" + str(i), i)
    assert cache.get("hot") == 1, "the hot key was evicted on round " + str(i)`,
        },
        {
          id: "still-evicts",
          name: "Eviction still happens",
          description: "Step 2's behaviour must survive step 3.",
          code: `cache = LRUCache(2)
cache.put("a", 1)
cache.put("b", 2)
cache.put("c", 3)
assert cache.get("a") == -1`,
        },
      ],
    },
  ],
);

// ─── Log Level Summary ───────────────────────────────────────────────

const LOG_PARSE = `LEVELS = ("DEBUG", "INFO", "WARN", "ERROR")


def parse_line(line: str) -> dict | None:
    parts = line.split(" ", 3)
    if len(parts) < 4:
        return None
    date, time, level, message = parts
    if level not in LEVELS:
        return None
    return {"timestamp": date + " " + time, "level": level, "message": message}
`;

const LOG_COUNT = `${LOG_PARSE}

def count_levels(lines: list[str]) -> dict[str, int]:
    counts = {}
    for line in lines:
        record = parse_line(line)
        if record is None:
            continue
        counts[record["level"]] = counts.get(record["level"], 0) + 1
    return counts
`;

const LOG_LEVEL_SUMMARY = codeSteps(
  {
    slug: "log-level-summary",
    title: "Log Level Summary",
    difficulty: "Beginner",
    topic: "Parsing",
    language: "python",
    description:
      "Turn raw log lines into a summary: parse one line, count the levels, then format the tally.",
    solutionNote: [
      "Returning ",
      { code: "None" },
      " for a line that does not parse, rather than raising, is what lets the caller skip junk and keep going — a log file always has a truncated last line or a stack trace in the middle. Splitting with ",
      { code: 'split(" ", 3)' },
      " caps the split at four pieces so the message keeps its own spaces.",
    ],
  },
  [
    {
      title: "Parse one line",
      short: "Parse",
      solutionNote: [
        "Returning ",
        { code: "None" },
        " for a line that does not fit, rather than raising, is what lets the caller skip junk and keep going — a real log file always has a truncated last line or a stack trace in the middle. Capping the split at four pieces is what keeps the message's own spaces.",
      ],
      signature: "def parse_line(line: str) -> dict | None",
      prompt: [
        [
          "A log line looks like ",
          { code: "2024-05-01 09:14:00 INFO user signed in" },
          ": a date, a time, a level, then the message. Return a dictionary with ",
          { code: "timestamp" },
          ", ",
          { code: "level" },
          " and ",
          { code: "message" },
          ".",
        ],
        [
          "Return ",
          { code: "None" },
          " for anything that does not fit — too few pieces, or a level that is not one of ",
          { code: "DEBUG INFO WARN ERROR" },
          ". The message keeps its own spaces, so cap the split at four pieces.",
        ],
      ],
      starter: `LEVELS = ("DEBUG", "INFO", "WARN", "ERROR")


def parse_line(line: str) -> dict | None:
    parts = line.split(" ", 3)
    # Four pieces, and the third must be a known level.
    return None
`,
      solution: LOG_PARSE,
      tests: [
        {
          id: "basic",
          name: "A well-formed line",
          code: `got = parse_line("2024-05-01 09:14:00 INFO user signed in")
assert got == {
    "timestamp": "2024-05-01 09:14:00",
    "level": "INFO",
    "message": "user signed in",
}, f"got {got}"`,
        },
        {
          id: "message-spaces",
          name: "The message keeps its spaces",
          code: `got = parse_line("2024-05-01 09:14:00 ERROR could not reach the queue")
assert got["message"] == "could not reach the queue", f"got {got['message']}"`,
        },
        {
          id: "unknown-level",
          name: "An unknown level does not parse",
          code: `assert parse_line("2024-05-01 09:14:00 TRACE something") is None`,
        },
        {
          id: "truncated",
          name: "A truncated line does not parse",
          code: `assert parse_line("2024-05-01 09:14:00") is None
assert parse_line("") is None`,
        },
      ],
    },
    {
      title: "Count the levels",
      short: "Count",
      solutionNote: [
        "Skipping the unparseable lines here rather than filtering them earlier keeps the two functions independent: ",
        { code: "parse_line" },
        " decides what a line means, and this decides what to do about the ones that mean nothing.",
      ],
      signature: "def count_levels(lines: list[str]) -> dict[str, int]",
      prompt: [
        [
          "Add ",
          { code: "count_levels" },
          ", which parses every line and returns how many there are at each level.",
        ],
        "Lines that do not parse are skipped, not counted and not fatal. Levels that never appear are absent from the result rather than present with a zero.",
      ],
      starter: `${LOG_PARSE}

def count_levels(lines: list[str]) -> dict[str, int]:
    counts = {}
    for line in lines:
        # Skip what does not parse; tally what does.
        pass
    return counts
`,
      solution: LOG_COUNT,
      tests: [
        {
          id: "counts",
          name: "Levels are tallied",
          code: `lines = [
    "2024-05-01 09:14:00 INFO one",
    "2024-05-01 09:15:00 ERROR two",
    "2024-05-01 09:16:00 INFO three",
]
assert count_levels(lines) == {"INFO": 2, "ERROR": 1}, f"got {count_levels(lines)}"`,
        },
        {
          id: "skips-junk",
          name: "Junk lines are skipped",
          code: `lines = ["2024-05-01 09:14:00 INFO one", "garbage", ""]
assert count_levels(lines) == {"INFO": 1}, f"got {count_levels(lines)}"`,
        },
        {
          id: "empty",
          name: "An empty log",
          code: `assert count_levels([]) == {}`,
        },
        {
          id: "absent-levels",
          name: "Unused levels are absent, not zero",
          code: `got = count_levels(["2024-05-01 09:14:00 WARN only"])
assert got == {"WARN": 1}, f"got {got}"`,
        },
      ],
    },
    {
      title: "Format the summary",
      short: "Summary",
      solutionNote: [
        "Absent levels stay absent rather than appearing at zero, which is the right default for a log summary — a report that lists DEBUG: 0 on a service that has never logged a debug line is noise. Sorting by count then name is what keeps the output stable between runs.",
      ],
      signature: "def summary(lines: list[str]) -> list[str]",
      prompt: [
        [
          "Finish with ",
          { code: "summary" },
          ", which returns ",
          { code: '"LEVEL: count"' },
          " strings with the busiest level first.",
        ],
        "Levels with the same count come out alphabetically, so the report is stable run to run.",
      ],
      starter: `${LOG_COUNT}

def summary(lines: list[str]) -> list[str]:
    counts = count_levels(lines)
    # Busiest first, ties alphabetical.
    return []
`,
      solution: `${LOG_COUNT}

def summary(lines: list[str]) -> list[str]:
    counts = count_levels(lines)
    ranked = sorted(counts, key=lambda level: (-counts[level], level))
    return [level + ": " + str(counts[level]) for level in ranked]
`,
      tests: [
        {
          id: "ranked",
          name: "Busiest level first",
          code: `lines = [
    "2024-05-01 09:14:00 INFO one",
    "2024-05-01 09:15:00 ERROR two",
    "2024-05-01 09:16:00 INFO three",
]
assert summary(lines) == ["INFO: 2", "ERROR: 1"], f"got {summary(lines)}"`,
        },
        {
          id: "ties",
          name: "Equal counts come out alphabetically",
          code: `lines = [
    "2024-05-01 09:14:00 WARN a",
    "2024-05-01 09:15:00 DEBUG b",
]
assert summary(lines) == ["DEBUG: 1", "WARN: 1"], f"got {summary(lines)}"`,
        },
        {
          id: "empty",
          name: "An empty log summarises to nothing",
          code: `assert summary([]) == []
assert summary(["garbage"]) == []`,
        },
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert parse_line("2024-05-01 09:14:00 INFO hi")["level"] == "INFO"
assert count_levels(["2024-05-01 09:14:00 INFO hi"]) == {"INFO": 1}`,
        },
      ],
    },
  ],
);

export const CODE_MULTI_PYTHON: Challenge[] = [
  WORD_FREQUENCY_PIPELINE,
  CSV_REPORT_BUILDER,
  RPN_CALCULATOR,
  BINARY_SEARCH_TREE,
  LRU_CACHE,
  LOG_LEVEL_SUMMARY,
];
