/**
 * Single-step code challenges: stacks, sorting, searching and intervals.
 *
 * What ties them together is that the obvious answer rescans. Rescanning the
 * string after every removal, scanning forward from every day, calling
 * `min()` over the whole stack, looking a position up with `index()`, walking
 * a run of duplicates one step at a time, checking every pair of meetings:
 * each is correct and each is quadratic (or linear per query where O(log n)
 * was the point). The fix is always a small piece of remembered structure: a
 * stack of what is still waiting, a rank map built once, a boundary found by
 * halving, a sweep over sorted endpoints.
 *
 * So wherever the naive answer is asymptotically too slow, the checks include
 * an input it cannot finish, and the prompt says so. Every challenge ships in
 * Python and JavaScript from one shared list of cases (`dualChallenge`), and
 * `__tests__/challengeSolutions` runs both reference solutions for real.
 */

import { dualChallenge } from "./authoring";
import type { Challenge } from "./types";

// ─── Remove Adjacent Duplicates ──────────────────────────────────────

const REMOVE_ADJACENT_DUPLICATES = dualChallenge({
  slug: "remove-adjacent-duplicates",
  title: "Remove Adjacent Duplicates",
  difficulty: "Beginner",
  topic: "Stacks",
  description: "Cancel out pairs of equal neighboring letters until none are left.",
  prompt: [
    "Given a string `s` of lowercase letters, remove any two adjacent letters that are equal. Removing a pair can bring two equal letters together, and those are removed too. Keep going until no two neighboring letters match, and return what is left.",
    "In `\"abbaca\"`, removing `bb` leaves `\"aaca\"`, which brings the two a's together; removing `aa` leaves `\"ca\"`. Only pairs cancel, so `\"aaa\"` becomes `\"a\"`. The result is the same whichever pair you remove first.",
    "The last check is a string of 200,000 letters in which every removal exposes exactly one new pair. Rescanning the string after each removal is quadratic there; one pass is enough.",
  ],
  params: ["s"],
  constraints: [
    "`0 ≤ len(s) ≤ 2 × 10⁵`",
    "`s` holds lowercase letters `a` to `z` only",
  ],
  solutionNote:
    "Keep the surviving letters on a stack. Each new letter either matches the top, and the two cancel, or is pushed; a removal that exposes a new pair is caught by the very next comparison, so nothing is ever rescanned. Looping `replace` or a regex until the string stops changing removes one layer of nesting per pass, which on input like the last check is quadratic.",
  python: {
    fn: "remove_adjacent_duplicates",
    signature: "def remove_adjacent_duplicates(s: str) -> str",
    starter: `def remove_adjacent_duplicates(s: str) -> str:
    # Push letters onto a stack; a letter equal to the top cancels it.
    return s
`,
    solution: `def remove_adjacent_duplicates(s: str) -> str:
    stack = []
    for ch in s:
        if stack and stack[-1] == ch:
            stack.pop()
        else:
            stack.append(ch)
    return "".join(stack)
`,
  },
  javascript: {
    fn: "removeAdjacentDuplicates",
    signature: "function removeAdjacentDuplicates(s: string): string",
    starter: `function removeAdjacentDuplicates(s) {
  // Push letters onto a stack; a letter equal to the top cancels it.
  return s;
}
`,
    solution: `function removeAdjacentDuplicates(s) {
  const stack = [];
  for (const ch of s) {
    if (stack.at(-1) === ch) stack.pop();
    else stack.push(ch);
  }
  return stack.join("");
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A removal exposes a new pair",
      args: ["abbaca"],
      expected: "ca",
      example: "Removing bb brings the two a's together, and they go too.",
    },
    {
      id: "example2",
      name: "Pairs cancel from the inside out",
      args: ["azxxzy"],
      expected: "ay",
      example: "xx goes, then zz, leaving a and y.",
    },
    {
      id: "odd-run",
      name: "Three in a row",
      description: "Only pairs cancel, so one letter survives.",
      args: ["aaa"],
      expected: "a",
    },
    {
      id: "everything",
      name: "Everything cancels",
      args: ["abccba"],
      expected: "",
    },
    {
      id: "nothing",
      name: "Nothing to remove",
      args: ["abcabc"],
      expected: "abcabc",
    },
    { id: "empty", name: "An empty string", args: [""], expected: "" },
    {
      id: "large",
      name: "200,000 letters, one pair at a time",
      description:
        "Each removal exposes exactly one new pair in the middle, so rescanning after every removal is too slow.",
      pyArgs: `"x" + "ab" * 50000 + "ba" * 50000 + "y"`,
      jsArgs: `"x" + "ab".repeat(50000) + "ba".repeat(50000) + "y"`,
      expected: "xy",
    },
  ],
});

// ─── Sort by Several Keys ────────────────────────────────────────────

const SORT_BY_SEVERAL_KEYS = dualChallenge({
  slug: "sort-by-several-keys",
  title: "Sort by Several Keys",
  difficulty: "Beginner",
  topic: "Sort keys",
  description: "Order staff by department, then highest salary, then name.",
  prompt: [
    "Each record in `records` is a dict (an object in JavaScript) with a `name`, a `dept` and an integer `salary`. Return the records ordered by department from A to Z; within a department, by salary from highest to lowest; and when two people in the same department earn the same, by name from A to Z.",
    "Return a new list and leave `records` in its original order: the caller is still using it.",
  ],
  params: ["records"],
  constraints: [
    "`0 ≤ len(records) ≤ 10⁴`",
    "Names and departments are capitalized words, so plain string comparison puts them in alphabetical order",
  ],
  solutionNote:
    "Sort on a tuple: `(dept, -salary, name)` compares departments first and falls through to the next field only on a tie, and negating the salary flips that one field to descending while the others stay ascending. In JavaScript the comparator chains with `||`, because a comparison that returns 0 hands over to the next one. Calling `records.sort()` would reorder the caller's list; `sorted()` and `toSorted()` return a new one.",
  python: {
    fn: "sort_employees",
    signature: "def sort_employees(records: list[dict]) -> list[dict]",
    starter: `def sort_employees(records: list[dict]) -> list[dict]:
    # Sort a copy on (department, salary high to low, name).
    return list(records)
`,
    solution: `def sort_employees(records: list[dict]) -> list[dict]:
    return sorted(records, key=lambda r: (r["dept"], -r["salary"], r["name"]))
`,
  },
  javascript: {
    fn: "sortEmployees",
    signature:
      "function sortEmployees(records: { name: string; dept: string; salary: number }[]): object[]",
    starter: `function sortEmployees(records) {
  // Sort a copy on department, then salary high to low, then name.
  return [...records];
}
`,
    solution: `function sortEmployees(records) {
  const byText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  return records.toSorted(
    (a, b) => byText(a.dept, b.dept) || b.salary - a.salary || byText(a.name, b.name),
  );
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Department, then salary",
      args: [
        [
          { name: "Priya", dept: "Sales", salary: 72000 },
          { name: "Omar", dept: "Design", salary: 64000 },
          { name: "Lena", dept: "Sales", salary: 81000 },
        ],
      ],
      expected: [
        { name: "Omar", dept: "Design", salary: 64000 },
        { name: "Lena", dept: "Sales", salary: 81000 },
        { name: "Priya", dept: "Sales", salary: 72000 },
      ],
      example: "Design sorts before Sales; within Sales the higher salary comes first.",
    },
    {
      id: "example2",
      name: "A salary tie falls to the name",
      args: [
        [
          { name: "Tomas", dept: "Support", salary: 54000 },
          { name: "Ines", dept: "Support", salary: 54000 },
          { name: "Ada", dept: "Support", salary: 61000 },
        ],
      ],
      expected: [
        { name: "Ada", dept: "Support", salary: 61000 },
        { name: "Ines", dept: "Support", salary: 54000 },
        { name: "Tomas", dept: "Support", salary: 54000 },
      ],
      example: "Ines and Tomas earn the same, so their names decide.",
    },
    {
      id: "dept-first",
      name: "The department decides first",
      description: "A lower salary in an earlier department still comes first.",
      args: [
        [
          { name: "Bo", dept: "Marketing", salary: 40000 },
          { name: "Cy", dept: "Finance", salary: 30000 },
        ],
      ],
      expected: [
        { name: "Cy", dept: "Finance", salary: 30000 },
        { name: "Bo", dept: "Marketing", salary: 40000 },
      ],
    },
    {
      id: "salary-before-name",
      name: "Salary decides before the name",
      description: "Zoe earns more than Abe, so she comes first.",
      args: [
        [
          { name: "Abe", dept: "Operations", salary: 50000 },
          { name: "Zoe", dept: "Operations", salary: 90000 },
        ],
      ],
      expected: [
        { name: "Zoe", dept: "Operations", salary: 90000 },
        { name: "Abe", dept: "Operations", salary: 50000 },
      ],
    },
    {
      id: "mixed",
      name: "A mixed team, input left alone",
      description: "Three departments with ties, and the input list must keep its original order.",
      args: [
        [
          { name: "Mei", dept: "Engineering", salary: 91000 },
          { name: "Arjun", dept: "Design", salary: 70000 },
          { name: "Sofia", dept: "Engineering", salary: 91000 },
          { name: "Dmitri", dept: "Engineering", salary: 120000 },
          { name: "Bea", dept: "Design", salary: 70000 },
          { name: "Hugo", dept: "Finance", salary: 83000 },
          { name: "Chen", dept: "Design", salary: 76000 },
        ],
      ],
      expected: [
        { name: "Chen", dept: "Design", salary: 76000 },
        { name: "Arjun", dept: "Design", salary: 70000 },
        { name: "Bea", dept: "Design", salary: 70000 },
        { name: "Dmitri", dept: "Engineering", salary: 120000 },
        { name: "Mei", dept: "Engineering", salary: 91000 },
        { name: "Sofia", dept: "Engineering", salary: 91000 },
        { name: "Hugo", dept: "Finance", salary: 83000 },
      ],
      noMutation: true,
    },
    {
      id: "single",
      name: "One record",
      args: [[{ name: "Nadia", dept: "Legal", salary: 88000 }]],
      expected: [{ name: "Nadia", dept: "Legal", salary: 88000 }],
    },
    { id: "empty", name: "No records", args: [[]], expected: [] },
  ],
});

// ─── Sort by a Custom Order ──────────────────────────────────────────

const CUSTOM_SORT_ORDER = dualChallenge({
  slug: "custom-sort-order",
  title: "Sort by a Custom Order",
  difficulty: "Beginner",
  topic: "Rank maps",
  description: "Put items in the order a reference list gives, with unlisted items last.",
  prompt: [
    "Sort `items` by where each one appears in `order`: items equal to `order[0]` come first, then items equal to `order[1]`, and so on. Items that do not appear in `order` go after all the listed ones, in alphabetical order. Repeated items are kept, side by side.",
    "Return a new list and leave `items` as it was.",
    "`order` can be long. Finding an item's position with `order.index(item)` rescans the whole of `order` every time, and the last check sorts 100,000 items against an order of 50,000 entries.",
  ],
  params: ["items", "order"],
  constraints: [
    "`0 ≤ len(items) ≤ 10⁵` and `0 ≤ len(order) ≤ 5 × 10⁴`",
    "`order` has no repeated entries",
    "Unlisted items compare by plain string comparison",
  ],
  solutionNote:
    "Turn `order` into a rank map once, `{value: position}`, so each lookup is O(1) instead of a scan. Then sort on a pair: the rank, with `len(order)` standing in for anything unlisted, and the item itself, which only breaks ties among the unlisted items and so puts them in alphabetical order.",
  python: {
    fn: "sort_by_order",
    signature: "def sort_by_order(items: list[str], order: list[str]) -> list[str]",
    starter: `def sort_by_order(items: list[str], order: list[str]) -> list[str]:
    # Build a position lookup from order once, then sort on it.
    return sorted(items)
`,
    solution: `def sort_by_order(items: list[str], order: list[str]) -> list[str]:
    rank = {item: i for i, item in enumerate(order)}
    unlisted = len(order)
    return sorted(items, key=lambda item: (rank.get(item, unlisted), item))
`,
  },
  javascript: {
    fn: "sortByOrder",
    signature: "function sortByOrder(items: string[], order: string[]): string[]",
    starter: `function sortByOrder(items, order) {
  // Build a position lookup from order once, then sort on it.
  return [...items].sort();
}
`,
    solution: `function sortByOrder(items, order) {
  const rank = new Map(order.map((item, i) => [item, i]));
  const unlisted = order.length;
  return items.toSorted((a, b) => {
    const byRank = (rank.get(a) ?? unlisted) - (rank.get(b) ?? unlisted);
    if (byRank !== 0) return byRank;
    return a < b ? -1 : a > b ? 1 : 0;
  });
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Sizes in size order",
      args: [
        ["M", "XL", "S", "M", "XS"],
        ["XS", "S", "M", "L", "XL"],
      ],
      expected: ["XS", "S", "M", "M", "XL"],
      example: "Both M's are kept. L is in the order but not in the items, which changes nothing.",
    },
    {
      id: "example2",
      name: "Unlisted items go last",
      args: [
        ["M", "XXS", "S", "3XL"],
        ["XS", "S", "M", "L", "XL"],
      ],
      expected: ["S", "M", "3XL", "XXS"],
      example: "3XL and XXS are not in the order, so they follow alphabetically.",
    },
    {
      id: "empty-order",
      name: "An empty order, input left alone",
      description: "Every item is unlisted, so the result is alphabetical; the input keeps its order.",
      args: [["pear", "apple", "fig"], []],
      expected: ["apple", "fig", "pear"],
      noMutation: true,
    },
    {
      id: "unlisted-duplicates",
      name: "Repeated unlisted items",
      args: [
        ["kiwi", "date", "kiwi", "apple", "lime"],
        ["lime", "apple"],
      ],
      expected: ["lime", "apple", "date", "kiwi", "kiwi"],
    },
    {
      id: "empty-items",
      name: "No items",
      args: [[], ["a", "b"]],
      expected: [],
    },
    {
      id: "large",
      name: "100,000 items, 50,000-entry order",
      description:
        "Searching the order list for every item is far too slow at this size; look positions up in a map.",
      pyArgs: `["zeta", "alpha"] + [f"sku-{49999 - i % 500}" for i in range(100000)], [f"sku-{i}" for i in range(50000)]`,
      jsArgs: `["zeta", "alpha", ...Array.from({ length: 100000 }, (_, i) => "sku-" + (49999 - (i % 500)))], Array.from({ length: 50000 }, (_, i) => "sku-" + i)`,
      pyExpected: `[f"sku-{k}" for k in range(49500, 50000) for _ in range(200)] + ["alpha", "zeta"]`,
      jsExpected: `[...Array.from({ length: 100000 }, (_, j) => "sku-" + (49500 + Math.floor(j / 200))), "alpha", "zeta"]`,
    },
  ],
});

// ─── Days Until Warmer ───────────────────────────────────────────────

const DAYS_UNTIL_WARMER = dualChallenge({
  slug: "days-until-warmer",
  title: "Days Until Warmer",
  difficulty: "Intermediate",
  topic: "Monotonic stacks",
  description: "For each day, count the days until a strictly warmer one.",
  prompt: [
    "`temps` holds one temperature reading per day, in degrees Celsius. For each day, return how many days you would wait for a strictly warmer reading. If no later day is warmer, that day's answer is 0. The result has the same length as `temps`.",
    "A day with the same temperature does not count as warmer.",
    "Scanning forward from every day is O(n²). The last check has 100,000 days at the same temperature before the first warmer one, so every forward scan runs to the end. Solve it in one pass.",
  ],
  params: ["temps"],
  constraints: ["`0 ≤ len(temps) ≤ 10⁵`", "`-60 ≤ temps[i] ≤ 60`"],
  solutionNote:
    "Keep a stack of the days still waiting for a warmer one; their temperatures never increase from bottom to top. Each new day pops every waiting day colder than itself and fills in their answers, then waits in turn. Every day is pushed once and popped at most once, so the pass is O(n). Popping on `<` rather than `<=` is what stops an equal reading from counting as warmer.",
  python: {
    fn: "days_until_warmer",
    signature: "def days_until_warmer(temps: list[int]) -> list[int]",
    starter: `def days_until_warmer(temps: list[int]) -> list[int]:
    # Keep a stack of days still waiting for a warmer one.
    return [0] * len(temps)
`,
    solution: `def days_until_warmer(temps: list[int]) -> list[int]:
    answer = [0] * len(temps)
    waiting = []  # indexes of days with no warmer day found yet
    for day, temp in enumerate(temps):
        while waiting and temps[waiting[-1]] < temp:
            earlier = waiting.pop()
            answer[earlier] = day - earlier
        waiting.append(day)
    return answer
`,
  },
  javascript: {
    fn: "daysUntilWarmer",
    signature: "function daysUntilWarmer(temps: number[]): number[]",
    starter: `function daysUntilWarmer(temps) {
  // Keep a stack of days still waiting for a warmer one.
  return temps.map(() => 0);
}
`,
    solution: `function daysUntilWarmer(temps) {
  const answer = new Array(temps.length).fill(0);
  const waiting = []; // indexes of days with no warmer day found yet
  temps.forEach((temp, day) => {
    while (waiting.length && temps[waiting.at(-1)] < temp) {
      const earlier = waiting.pop();
      answer[earlier] = day - earlier;
    }
    waiting.push(day);
  });
  return answer;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A week of readings",
      args: [[13, 14, 15, 11, 9, 12, 16, 13]],
      expected: [1, 1, 4, 2, 1, 1, 0, 0],
      example: "The 15 on the third day waits four days for the 16; the last two days never see anything warmer.",
    },
    {
      id: "example2",
      name: "Equal is not warmer",
      args: [[20, 20, 21]],
      expected: [2, 1, 0],
      example: "The second 20 does not count, so the first day waits two days.",
    },
    {
      id: "falling",
      name: "Only getting colder",
      args: [[30, 25, 20, 15]],
      expected: [0, 0, 0, 0],
    },
    {
      id: "negatives",
      name: "Below freezing",
      args: [[-5, -12, -3, -8, 0]],
      expected: [2, 1, 2, 1, 0],
    },
    { id: "single", name: "One day", args: [[18]], expected: [0] },
    { id: "empty", name: "No days", args: [[]], expected: [] },
    {
      id: "large",
      name: "A 100,000-day cold spell",
      description:
        "Every day waits until the very last one, so a forward scan from each day is too slow.",
      pyArgs: `[4] * 100000 + [5]`,
      jsArgs: `[...new Array(100000).fill(4), 5]`,
      pyExpected: `list(range(100000, 0, -1)) + [0]`,
      jsExpected: `[...Array.from({ length: 100000 }, (_, i) => 100000 - i), 0]`,
    },
  ],
});

// ─── Simplify a File Path ────────────────────────────────────────────

const SIMPLIFY_PATH = dualChallenge({
  slug: "simplify-path",
  title: "Simplify a File Path",
  difficulty: "Intermediate",
  topic: "Stacks",
  description: "Resolve dots, double dots and repeated slashes in an absolute Unix path.",
  prompt: [
    "Given an absolute Unix-style `path`, return its canonical form. In the input, `.` means the current directory, `..` means the parent directory, and several slashes in a row count as one.",
    "The canonical path starts with a single `/`, separates directory names with single slashes, has no trailing slash, and contains no `.` or `..` components. Going up from the root stays at the root, so `/../` is `/`. Any other name made of dots, such as `...`, is an ordinary directory name, and so is a name that merely starts with a dot.",
  ],
  params: ["path"],
  constraints: [
    "`path` starts with `/`",
    "`1 ≤ len(path) ≤ 3000`",
    "Names contain letters, digits, `_` and `.`",
  ],
  solutionNote:
    "Split on `/` and treat the pieces as moves: an empty piece or `.` does nothing, `..` pops the last directory if there is one, and anything else is pushed. Joining what is left with `/` behind a leading slash gives the canonical path, and the root comes out as `/` with nothing after it. Rewriting the string with replacements is where the bugs come from instead: a careless pattern mistakes `...` for `..`, and a `..` at the root has nothing to remove.",
  python: {
    fn: "simplify_path",
    signature: "def simplify_path(path: str) -> str",
    starter: `def simplify_path(path: str) -> str:
    # Split on "/" and keep a stack of directory names.
    return path
`,
    solution: `def simplify_path(path: str) -> str:
    parts = []
    for name in path.split("/"):
        if name == "..":
            if parts:
                parts.pop()
        elif name and name != ".":
            parts.append(name)
    return "/" + "/".join(parts)
`,
  },
  javascript: {
    fn: "simplifyPath",
    signature: "function simplifyPath(path: string): string",
    starter: `function simplifyPath(path) {
  // Split on "/" and keep a stack of directory names.
  return path;
}
`,
    solution: `function simplifyPath(path) {
  const parts = [];
  for (const name of path.split("/")) {
    if (name === "..") parts.pop(); // popping an empty stack is a no-op
    else if (name !== "" && name !== ".") parts.push(name);
  }
  return "/" + parts.join("/");
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Doubled slashes, a dot and a trailing slash",
      args: ["/home//user/./docs/"],
      expected: "/home/user/docs",
      example: "The doubled slash, the dot and the trailing slash all disappear.",
    },
    {
      id: "example2",
      name: "Going back up",
      args: ["/a/./b/../../c/"],
      expected: "/c",
      example: "The first .. undoes b and the second undoes a.",
    },
    {
      id: "above-root",
      name: "Going above the root",
      description: "A .. at the root has nothing to remove.",
      args: ["/../../var/log/.."],
      expected: "/var",
    },
    {
      id: "back-to-root",
      name: "Back to the root",
      args: ["/usr/bin/../../"],
      expected: "/",
    },
    { id: "root", name: "Just the root", args: ["/"], expected: "/" },
    {
      id: "dot-names",
      name: "Dots that are names",
      description: "Three dots, or a name starting with a dot, is a directory like any other.",
      args: ["/.../a/../.config/"],
      expected: "/.../.config",
    },
    {
      id: "slash-runs",
      name: "Runs of slashes",
      args: ["///srv///www/./.././static"],
      expected: "/srv/static",
    },
  ],
});

// ─── Stack With a Minimum ────────────────────────────────────────────

const MIN_STACK_OPS = dualChallenge({
  slug: "min-stack-ops",
  title: "Stack With a Minimum",
  difficulty: "Intermediate",
  topic: "Auxiliary stacks",
  description: "Run stack operations and answer every minimum query in constant time.",
  prompt: [
    "Simulate a stack of integers that can also report its smallest value. `ops` is a list of operations, each one a list: `[\"push\", x]` pushes `x`, `[\"pop\"]` removes the top value, `[\"top\"]` reads the top value, and `[\"min\"]` reads the smallest value currently on the stack.",
    "Return the values read by every `top` and `min`, in the order they happened. `pop`, `top` and `min` are only ever applied to a non-empty stack, and the same value can be pushed more than once.",
    "Every operation must be O(1). Calling `min()` over the whole stack is O(n) per query, and the last check pushes 100,000 values, then asks for the minimum before every pop. Remember that a pop can remove the current minimum.",
  ],
  params: ["ops"],
  constraints: ["`0 ≤ len(ops) ≤ 3 × 10⁵`", "`-10⁹ ≤ x ≤ 10⁹`"],
  solutionNote:
    "Keep a second stack beside the values that records the minimum at each height: pushing `x` also pushes the smaller of `x` and the current minimum, and a pop removes both. After a pop, the top of the minimum stack is the minimum of what remains, with nothing rescanned. A single `smallest` variable is the trap: it is right until the minimum is popped, and then there is no way back to the one before it.",
  python: {
    fn: "run_min_stack",
    signature: "def run_min_stack(ops: list[list]) -> list[int]",
    starter: `def run_min_stack(ops: list[list]) -> list[int]:
    out = []
    for op in ops:
        # Track the minimum at every height so "min" never scans.
        pass
    return out
`,
    solution: `def run_min_stack(ops: list[list]) -> list[int]:
    values, minimums, out = [], [], []
    for op in ops:
        match op:
            case ["push", x]:
                values.append(x)
                minimums.append(min(x, minimums[-1]) if minimums else x)
            case ["pop"]:
                values.pop()
                minimums.pop()
            case ["top"]:
                out.append(values[-1])
            case ["min"]:
                out.append(minimums[-1])
    return out
`,
  },
  javascript: {
    fn: "runMinStack",
    signature: "function runMinStack(ops: [string, number?][]): number[]",
    starter: `function runMinStack(ops) {
  const out = [];
  for (const [name, x] of ops) {
    // Track the minimum at every height so "min" never scans.
  }
  return out;
}
`,
    solution: `function runMinStack(ops) {
  const stack = []; // [value, minimum of everything at or below it]
  const out = [];
  for (const [name, x] of ops) {
    if (name === "push") stack.push([x, stack.length ? Math.min(x, stack.at(-1)[1]) : x]);
    else if (name === "pop") stack.pop();
    else if (name === "top") out.push(stack.at(-1)[0]);
    else out.push(stack.at(-1)[1]);
  }
  return out;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Push, read and pop",
      args: [
        [
          ["push", 5], ["push", 3], ["min"], ["push", 7], ["top"], ["min"],
          ["pop"], ["pop"], ["min"], ["top"],
        ],
      ],
      expected: [3, 7, 3, 5, 5],
      example: "Popping 7 and then 3 brings the minimum back to 5.",
    },
    {
      id: "repeated-min",
      name: "A repeated minimum",
      description: "Popping one copy of the smallest value leaves the other.",
      args: [
        [["push", 2], ["push", 1], ["push", 1], ["pop"], ["min"], ["pop"], ["min"]],
      ],
      expected: [1, 2],
    },
    {
      id: "zero-negative",
      name: "Zero and negative values",
      description: "A minimum of 0 is still a minimum.",
      args: [
        [
          ["push", 0], ["push", -4], ["push", 6], ["min"], ["pop"], ["pop"],
          ["min"], ["top"],
        ],
      ],
      expected: [-4, 0, 0],
    },
    {
      id: "push-after-pop",
      name: "Pushes after pops",
      args: [
        [
          ["push", 3], ["push", 8], ["pop"], ["push", 5], ["min"], ["push", 2],
          ["min"], ["pop"], ["min"], ["top"],
        ],
      ],
      expected: [3, 2, 3, 5],
    },
    {
      id: "no-reads",
      name: "Nothing to report",
      args: [[["push", 1], ["push", 2], ["pop"], ["pop"]]],
      expected: [],
    },
    { id: "empty", name: "No operations", args: [[]], expected: [] },
    {
      id: "large",
      name: "100,000 minimums",
      description:
        "Each pop removes the current minimum, and scanning the stack for the new one is too slow.",
      pyArgs: `[["push", 100000 - i] for i in range(100000)] + [["min"] if i % 2 == 0 else ["pop"] for i in range(200000)]`,
      jsArgs: `[...Array.from({ length: 100000 }, (_, i) => ["push", 100000 - i]), ...Array.from({ length: 200000 }, (_, i) => (i % 2 === 0 ? ["min"] : ["pop"]))]`,
      pyExpected: `list(range(1, 100001))`,
      jsExpected: `Array.from({ length: 100000 }, (_, i) => i + 1)`,
    },
  ],
});

// ─── Valid Push and Pop Order ────────────────────────────────────────

const VALID_STACK_SEQUENCE = dualChallenge({
  slug: "valid-stack-sequence",
  title: "Valid Push and Pop Order",
  difficulty: "Intermediate",
  topic: "Simulating a stack",
  description: "Decide whether one stack could have produced a given order of pops.",
  prompt: [
    "Values are pushed onto an empty stack in the order given by `pushed`, and at any moment the top value may be popped. Return whether the values could have come off the stack in exactly the order given by `popped`.",
    "Pushes happen in order and none can be skipped; a pop can happen whenever the stack is not empty, including straight after each push. The values in `pushed` are distinct, and `popped` holds the same values rearranged.",
    "Trying every way of interleaving the pushes and pops is exponential, and searching the stack for each value is quadratic; the last check has 100,000 values.",
  ],
  params: ["pushed", "popped"],
  constraints: [
    "`0 ≤ len(pushed) ≤ 10⁵` and `len(popped) == len(pushed)`",
    "The values in `pushed` are distinct integers, and `popped` is a rearrangement of them",
  ],
  solutionNote:
    "Replay it. Push the values in order, and after each push keep popping while the top is the next value `popped` expects. Popping greedily is always safe, because waiting can only bury a value that is ready now. The order is possible exactly when the stack is empty at the end.",
  python: {
    fn: "is_valid_stack_order",
    signature: "def is_valid_stack_order(pushed: list[int], popped: list[int]) -> bool",
    starter: `def is_valid_stack_order(pushed: list[int], popped: list[int]) -> bool:
    # Replay the pushes, popping whenever the top is the next value expected.
    return True
`,
    solution: `def is_valid_stack_order(pushed: list[int], popped: list[int]) -> bool:
    stack = []
    next_pop = 0
    for value in pushed:
        stack.append(value)
        while stack and stack[-1] == popped[next_pop]:
            stack.pop()
            next_pop += 1
    return not stack
`,
  },
  javascript: {
    fn: "isValidStackOrder",
    signature: "function isValidStackOrder(pushed: number[], popped: number[]): boolean",
    starter: `function isValidStackOrder(pushed, popped) {
  // Replay the pushes, popping whenever the top is the next value expected.
  return true;
}
`,
    solution: `function isValidStackOrder(pushed, popped) {
  const stack = [];
  let next = 0;
  for (const value of pushed) {
    stack.push(value);
    while (stack.length && stack.at(-1) === popped[next]) {
      stack.pop();
      next++;
    }
  }
  return stack.length === 0;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A possible order",
      args: [
        [1, 2, 3, 4, 5],
        [4, 5, 3, 2, 1],
      ],
      expected: true,
      example: "Push 1 to 4 and pop 4, push 5 and pop 5, then pop 3, 2 and 1.",
    },
    {
      id: "example2",
      name: "An impossible order",
      args: [
        [1, 2, 3, 4, 5],
        [4, 3, 5, 1, 2],
      ],
      expected: false,
      example: "Once 4, 3 and 5 are off, 1 is buried under 2.",
    },
    {
      id: "immediate",
      name: "Pop straight after each push",
      args: [
        [1, 2, 3],
        [1, 2, 3],
      ],
      expected: true,
    },
    {
      id: "all-first",
      name: "Push everything, then pop",
      args: [
        [8, 6, 7, 5],
        [5, 7, 6, 8],
      ],
      expected: true,
    },
    { id: "one", name: "One value", args: [[9], [9]], expected: true },
    { id: "empty", name: "Nothing pushed", args: [[], []], expected: true },
    {
      id: "large",
      name: "100,000 values, the last two swapped",
      description:
        "The stack grows to every value before anything comes off, and the final two pops are in the wrong order.",
      pyArgs: `list(range(100000)), list(range(99999, 1, -1)) + [0, 1]`,
      jsArgs: `Array.from({ length: 100000 }, (_, i) => i), [...Array.from({ length: 99998 }, (_, i) => 99999 - i), 0, 1]`,
      expected: false,
    },
  ],
});

// ─── First and Last Position ─────────────────────────────────────────

const FIRST_AND_LAST_POSITION = dualChallenge({
  slug: "first-and-last-position",
  title: "First and Last Position",
  difficulty: "Intermediate",
  topic: "Binary search bounds",
  description: "Find where a repeated value starts and ends in a sorted list, in O(log n).",
  prompt: [
    "`nums` is sorted in ascending order and may repeat values. Return `[first, last]`: the index of the first occurrence of `target` and the index of its last. If `target` does not occur, return `[-1, -1]`.",
    "Each call must run in O(log n). The last two checks call your function thousands of times against a list of a million values, so a linear scan fails, and so does finding one copy by binary search and then walking outwards: a value can repeat hundreds of thousands of times.",
  ],
  params: ["nums", "target"],
  constraints: [
    "`0 ≤ len(nums) ≤ 10⁶`",
    "`nums` is sorted ascending and holds integers, possibly repeated",
  ],
  solutionNote:
    "Run two binary searches for two boundaries: the first index whose value is at least `target`, and the first index whose value is greater than it. The first is where the run starts, if the value there is `target` at all, and one before the second is where it ends. Each search is O(log n) however long the run is, while stopping at any copy and walking outwards costs the length of the run.",
  python: {
    fn: "find_range",
    signature: "def find_range(nums: list[int], target: int) -> list[int]",
    starter: `def find_range(nums: list[int], target: int) -> list[int]:
    # Binary search for where the run of target starts, and where it ends.
    return [-1, -1]
`,
    solution: `from bisect import bisect_left, bisect_right


def find_range(nums: list[int], target: int) -> list[int]:
    first = bisect_left(nums, target)  # first index with a value >= target
    if first == len(nums) or nums[first] != target:
        return [-1, -1]
    return [first, bisect_right(nums, target) - 1]  # before the first value > target
`,
    extra: [
      {
        id: "many-lookups",
        name: "Ten thousand lookups in a million values",
        description: "Half the targets are present four times, half are missing; a linear scan per call is too slow.",
        code: `nums = [(i // 4) * 2 for i in range(1_000_000)]
for k in range(0, 250_000, 50):
    got = list(find_range(nums, 2 * k))
    assert got == [4 * k, 4 * k + 3], f"find_range(nums, {2 * k}) returned {got!r}, expected {[4 * k, 4 * k + 3]!r}"
    got = list(find_range(nums, 2 * k + 1))
    assert got == [-1, -1], f"find_range(nums, {2 * k + 1}) returned {got!r}, expected [-1, -1]"`,
      },
      {
        id: "long-runs",
        name: "Runs hundreds of thousands long",
        description: "Finding one copy and walking outwards to the ends of its run is too slow here.",
        code: `nums = [3] * 400_000 + [7] * 600_000
for _ in range(4000):
    got = list(find_range(nums, 3))
    assert got == [0, 399999], f"find_range(nums, 3) returned {got!r}, expected [0, 399999]"
    got = list(find_range(nums, 7))
    assert got == [400000, 999999], f"find_range(nums, 7) returned {got!r}, expected [400000, 999999]"
    got = list(find_range(nums, 5))
    assert got == [-1, -1], f"find_range(nums, 5) returned {got!r}, expected [-1, -1]"`,
      },
    ],
  },
  javascript: {
    fn: "findRange",
    signature: "function findRange(nums: number[], target: number): number[]",
    starter: `function findRange(nums, target) {
  // Binary search for where the run of target starts, and where it ends.
  return [-1, -1];
}
`,
    solution: `function findRange(nums, target) {
  // The first index whose value no longer satisfies before().
  const boundary = (before) => {
    let lo = 0;
    let hi = nums.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (before(nums[mid])) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  const first = boundary((x) => x < target);
  if (nums[first] !== target) return [-1, -1];
  return [first, boundary((x) => x <= target) - 1];
}
`,
    extra: [
      {
        id: "many-lookups",
        name: "Ten thousand lookups in a million values",
        description: "Half the targets are present four times, half are missing; a linear scan per call is too slow.",
        code: `const nums = Array.from({ length: 1000000 }, (_, i) => Math.floor(i / 4) * 2);
for (let k = 0; k < 250000; k += 50) {
  const hit = findRange(nums, 2 * k);
  if (JSON.stringify(hit) !== JSON.stringify([4 * k, 4 * k + 3])) {
    throw new Error("findRange(nums, " + 2 * k + ") returned " + JSON.stringify(hit) + ", expected " + JSON.stringify([4 * k, 4 * k + 3]));
  }
  const miss = findRange(nums, 2 * k + 1);
  if (JSON.stringify(miss) !== "[-1,-1]") {
    throw new Error("findRange(nums, " + (2 * k + 1) + ") returned " + JSON.stringify(miss) + ", expected [-1,-1]");
  }
}`,
      },
      {
        id: "long-runs",
        name: "Runs hundreds of thousands long",
        description: "Finding one copy and walking outwards to the ends of its run is too slow here.",
        code: `const nums = [...new Array(400000).fill(3), ...new Array(600000).fill(7)];
const want = { 3: "[0,399999]", 7: "[400000,999999]", 5: "[-1,-1]" };
for (let round = 0; round < 4000; round++) {
  for (const target of [3, 7, 5]) {
    const got = JSON.stringify(findRange(nums, target));
    if (got !== want[target]) {
      throw new Error("findRange(nums, " + target + ") returned " + got + ", expected " + want[target]);
    }
  }
}`,
      },
    ],
  },
  cases: [
    {
      id: "example1",
      name: "A run of two",
      args: [[5, 7, 7, 8, 8, 10], 8],
      expected: [3, 4],
      example: "The two 8s sit at indexes 3 and 4.",
    },
    {
      id: "example2",
      name: "A missing target",
      args: [[5, 7, 7, 8, 8, 10], 6],
      expected: [-1, -1],
      example: "6 would fall between the 7s and the 8s, but it is not there.",
    },
    {
      id: "single-copy",
      name: "One copy",
      args: [[1, 4, 9], 4],
      expected: [1, 1],
    },
    {
      id: "all-target",
      name: "Every value is the target",
      args: [[2, 2, 2, 2], 2],
      expected: [0, 3],
    },
    {
      id: "negatives",
      name: "Negatives before the run",
      args: [[-4, -4, -1, 0, 0, 0, 3], 0],
      expected: [3, 5],
    },
    {
      id: "past-end",
      name: "Beyond the last value",
      description: "The search runs off the end of the list.",
      args: [[1, 3, 5], 9],
      expected: [-1, -1],
    },
    { id: "empty", name: "An empty list", args: [[], 0], expected: [-1, -1] },
  ],
});

// ─── Kth Largest Element ─────────────────────────────────────────────

const KTH_LARGEST = dualChallenge({
  slug: "kth-largest",
  title: "Kth Largest Element",
  difficulty: "Intermediate",
  topic: "Selection",
  description: "Pick the value that would sit at position k in descending order.",
  prompt: [
    "Return the `k`-th largest value in `nums`, counting duplicates: in `[5, 5, 4]` the largest and second largest are both 5, and the third largest is 4. `k` counts from 1 and is never more than the length of the list.",
    "Leave `nums` unchanged. Removing the maximum `k` times is O(n·k), which is too slow for the last check: 200,000 values with `k` = 80,000.",
  ],
  params: ["nums", "k"],
  constraints: ["`1 ≤ k ≤ len(nums) ≤ 2 × 10⁵`", "`-10⁹ ≤ nums[i] ≤ 10⁹`"],
  solutionNote:
    "Keep a min-heap of the `k` largest values seen so far: each value that beats the heap's smallest replaces it, and at the end the smallest of the `k` survivors is the answer. That is O(n log k) with O(k) memory, which is why it is the standard answer for streamed data; sorting a copy in descending order and taking position `k - 1` is O(n log n) and just as correct here. In JavaScript, give `sort` a numeric comparator: by default it compares values as strings, which puts 9 above 100.",
  python: {
    fn: "kth_largest",
    signature: "def kth_largest(nums: list[int], k: int) -> int",
    starter: `def kth_largest(nums: list[int], k: int) -> int:
    # Keep the k largest values seen so far in a min-heap.
    return max(nums)
`,
    solution: `import heapq


def kth_largest(nums: list[int], k: int) -> int:
    heap = nums[:k]  # a copy, so nums is left alone
    heapq.heapify(heap)
    for value in nums[k:]:
        if value > heap[0]:
            heapq.heapreplace(heap, value)
    return heap[0]
`,
  },
  javascript: {
    fn: "kthLargest",
    signature: "function kthLargest(nums: number[], k: number): number",
    starter: `function kthLargest(nums, k) {
  // Sort a copy from largest to smallest, or keep the k largest in a heap.
  return Math.max(...nums);
}
`,
    solution: `function kthLargest(nums, k) {
  return nums.toSorted((a, b) => b - a)[k - 1];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "The second largest",
      args: [[3, 2, 1, 5, 6, 4], 2],
      expected: 5,
      example: "In descending order the list starts 6, 5.",
    },
    {
      id: "example2",
      name: "Duplicates count",
      args: [[3, 2, 3, 1, 2, 4, 5, 5, 6], 4],
      expected: 4,
      example: "Descending: 6, 5, 5, 4. Both 5s take a place.",
    },
    {
      id: "numeric",
      name: "Numbers, not strings, input left alone",
      description: "Compared as text, 9 would rank above 100. The list must keep its order.",
      args: [[10, 9, 2, 100, 33], 1],
      expected: 100,
      noMutation: true,
    },
    {
      id: "smallest",
      name: "The smallest, when k is the length",
      args: [[7, -2, 4], 3],
      expected: -2,
    },
    { id: "equal", name: "All values equal", args: [[5, 5, 5, 5], 3], expected: 5 },
    { id: "single", name: "One value", args: [[42], 1], expected: 42 },
    {
      id: "large",
      name: "200,000 values, k = 80,000",
      description: "Removing the maximum eighty thousand times is too slow.",
      pyArgs: `[(i * 7919) % 200000 for i in range(200000)], 80000`,
      jsArgs: `Array.from({ length: 200000 }, (_, i) => (i * 7919) % 200000), 80000`,
      expected: 120000,
    },
  ],
});

// ─── Insert an Interval ──────────────────────────────────────────────

const INSERT_INTERVAL = dualChallenge({
  slug: "insert-interval",
  title: "Insert an Interval",
  difficulty: "Intermediate",
  topic: "Intervals",
  description: "Add one interval to a sorted, disjoint list and merge whatever it touches.",
  prompt: [
    "`intervals` is a list of `[start, end]` pairs, sorted by start, in which no two pairs overlap or touch. Insert `new_interval` and return the result in the same form: sorted by start, with every pair that now overlaps or touches another merged into one.",
    "Intervals include both ends, so `[1, 2]` and `[2, 3]` touch at 2 and merge into `[1, 3]`, while `[1, 2]` and `[3, 4]` do not touch. Return a new list and leave `intervals` unchanged.",
    "The list is already sorted, so it does not need sorting again: one pass can copy the intervals that end before the new one, absorb the ones it overlaps, and copy the rest.",
  ],
  params: ["intervals", "new_interval"],
  constraints: [
    "`0 ≤ len(intervals) ≤ 10⁴`",
    "`start ≤ end` in every pair, including `new_interval`",
    "`intervals` is sorted by start, and no two of its pairs overlap or touch",
  ],
  solutionNote:
    "Because the input is sorted and disjoint, it falls into three runs: intervals that end before `new_interval` starts, intervals that overlap it, and intervals that start after it ends. Copy the first run, fold the middle one into a single interval with the smallest start and the largest end, and copy the last. Using strict `<` and `>` for the two outer runs is what makes touching intervals land in the middle and merge.",
  python: {
    fn: "insert_interval",
    signature:
      "def insert_interval(intervals: list[list[int]], new_interval: list[int]) -> list[list[int]]",
    starter: `def insert_interval(intervals: list[list[int]], new_interval: list[int]) -> list[list[int]]:
    # Copy what ends before it, merge what overlaps it, copy the rest.
    return intervals + [new_interval]
`,
    solution: `def insert_interval(intervals: list[list[int]], new_interval: list[int]) -> list[list[int]]:
    start, end = new_interval
    before = [iv for iv in intervals if iv[1] < start]
    after = [iv for iv in intervals if iv[0] > end]
    for s, e in intervals[len(before):len(intervals) - len(after)]:
        start, end = min(start, s), max(end, e)
    return [*before, [start, end], *after]
`,
  },
  javascript: {
    fn: "insertInterval",
    signature:
      "function insertInterval(intervals: number[][], newInterval: number[]): number[][]",
    starter: `function insertInterval(intervals, newInterval) {
  // Copy what ends before it, merge what overlaps it, copy the rest.
  return [...intervals, newInterval];
}
`,
    solution: `function insertInterval(intervals, newInterval) {
  let [start, end] = newInterval;
  const result = [];
  let placed = false;
  for (const [s, e] of intervals) {
    if (e < start) {
      result.push([s, e]);
    } else if (s > end) {
      if (!placed) result.push([start, end]);
      placed = true;
      result.push([s, e]);
    } else {
      start = Math.min(start, s);
      end = Math.max(end, e);
    }
  }
  if (!placed) result.push([start, end]);
  return result;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Overlaps one interval",
      args: [
        [
          [1, 3],
          [6, 9],
        ],
        [2, 5],
      ],
      expected: [
        [1, 5],
        [6, 9],
      ],
      example: "[2, 5] overlaps [1, 3] and stops short of [6, 9].",
    },
    {
      id: "example2",
      name: "Absorbs a run of intervals",
      args: [
        [
          [1, 2],
          [3, 5],
          [6, 7],
          [8, 10],
          [12, 16],
        ],
        [4, 8],
      ],
      expected: [
        [1, 2],
        [3, 10],
        [12, 16],
      ],
      example: "[4, 8] reaches from inside [3, 5] to the start of [8, 10], absorbing [6, 7] on the way.",
      noMutation: true,
    },
    {
      id: "touching",
      name: "Touching counts as overlapping",
      description: "The new interval meets both neighbors at their ends, joining all three. The input list must not change.",
      args: [
        [
          [1, 2],
          [5, 6],
        ],
        [2, 5],
      ],
      expected: [[1, 6]],
      noMutation: true,
    },
    {
      id: "gap",
      name: "Fits in a gap",
      args: [
        [
          [1, 3],
          [6, 9],
        ],
        [4, 5],
      ],
      expected: [
        [1, 3],
        [4, 5],
        [6, 9],
      ],
    },
    {
      id: "before",
      name: "Before everything",
      args: [
        [
          [3, 4],
          [6, 8],
        ],
        [0, 1],
      ],
      expected: [
        [0, 1],
        [3, 4],
        [6, 8],
      ],
    },
    {
      id: "after",
      name: "After everything",
      args: [[[1, 2]], [5, 6]],
      expected: [
        [1, 2],
        [5, 6],
      ],
    },
    {
      id: "swallows",
      name: "Swallows the whole list, input left alone",
      description: "Every interval merges into one, and the input list must not change.",
      args: [
        [
          [2, 3],
          [4, 5],
          [7, 9],
        ],
        [1, 10],
      ],
      expected: [[1, 10]],
      noMutation: true,
    },
    {
      id: "empty",
      name: "An empty list",
      args: [[], [5, 7]],
      expected: [[5, 7]],
    },
  ],
});

// ─── Meeting Rooms Needed ────────────────────────────────────────────

const MEETING_ROOMS = dualChallenge({
  slug: "meeting-rooms",
  title: "Meeting Rooms Needed",
  difficulty: "Intermediate",
  topic: "Sweep line",
  description: "Find how many rooms a set of meetings needs so that none of them clash.",
  prompt: [
    "Each meeting in `meetings` is a `[start, end]` pair of times in minutes, and occupies a room from `start` up to but not including `end`. Return the smallest number of rooms that lets every meeting happen, given that a room holds one meeting at a time.",
    "A meeting that ends at 600 frees its room for one that starts at 600, so back-to-back meetings can share a room. The meetings are in no particular order.",
    "Checking every pair of meetings for overlap is O(n²); the last check has 100,000 meetings.",
  ],
  params: ["meetings"],
  constraints: ["`0 ≤ len(meetings) ≤ 10⁵`", "`0 ≤ start < end ≤ 10⁶`"],
  solutionNote:
    "Only the moments when a meeting starts or ends can change how many rooms are busy, so sweep through them in time order: one more room at each start, one fewer at each end, and the answer is the peak. It never matters which meeting an end belongs to, so the start times and end times can be sorted separately. At a tie the end must come first (a start at or after the earliest open end reuses that room); the other way round, every back-to-back hand-over counts as an extra room.",
  python: {
    fn: "min_meeting_rooms",
    signature: "def min_meeting_rooms(meetings: list[list[int]]) -> int",
    starter: `def min_meeting_rooms(meetings: list[list[int]]) -> int:
    # Sweep the start and end times in order, tracking rooms in use.
    return len(meetings)
`,
    solution: `def min_meeting_rooms(meetings: list[list[int]]) -> int:
    starts = sorted(start for start, _ in meetings)
    ends = sorted(end for _, end in meetings)
    rooms = 0
    freed = 0  # how many of the earliest ends have handed their room on
    for start in starts:
        if start >= ends[freed]:  # that meeting is over: reuse its room
            freed += 1
        else:
            rooms += 1
    return rooms
`,
  },
  javascript: {
    fn: "minMeetingRooms",
    signature: "function minMeetingRooms(meetings: [number, number][]): number",
    starter: `function minMeetingRooms(meetings) {
  // Sweep the start and end times in order, tracking rooms in use.
  return meetings.length;
}
`,
    solution: `function minMeetingRooms(meetings) {
  // [time, change]; at equal times -1 sorts first, so an end frees its room
  // before a start at the same minute needs one.
  const events = meetings
    .flatMap(([start, end]) => [[start, 1], [end, -1]])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let busy = 0;
  let peak = 0;
  for (const [, change] of events) {
    busy += change;
    peak = Math.max(peak, busy);
  }
  return peak;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "One meeting overlaps both others",
      args: [
        [
          [540, 600],
          [560, 620],
          [610, 660],
        ],
      ],
      expected: 2,
      example: "The meeting from 560 to 620 overlaps both others, but they never overlap each other.",
    },
    {
      id: "example2",
      name: "Back to back",
      args: [
        [
          [540, 600],
          [600, 660],
          [660, 720],
        ],
      ],
      expected: 1,
      example: "Each meeting starts the minute the previous one ends, so one room is enough.",
    },
    {
      id: "nested",
      name: "All at once",
      args: [
        [
          [0, 60],
          [10, 50],
          [20, 40],
          [30, 35],
        ],
      ],
      expected: 4,
    },
    {
      id: "handover",
      name: "Hand-overs in any order",
      description: "Two meetings start at 600 just as one ends there.",
      args: [
        [
          [600, 700],
          [480, 600],
          [600, 650],
          [420, 480],
        ],
      ],
      expected: 2,
    },
    { id: "one", name: "One meeting", args: [[[100, 200]]], expected: 1 },
    { id: "empty", name: "No meetings", args: [[]], expected: 0 },
    {
      id: "large",
      name: "100,000 meetings",
      description: "Each lasts 1,000 minutes and a new one starts every minute, in shuffled order; comparing every pair is too slow.",
      pyArgs: `[[s, s + 1000] for s in ((i * 7919) % 100000 for i in range(100000))]`,
      jsArgs: `Array.from({ length: 100000 }, (_, i) => [(i * 7919) % 100000, ((i * 7919) % 100000) + 1000])`,
      expected: 1000,
    },
  ],
});

// ─── Decode a Nested String ──────────────────────────────────────────

const DECODE_NESTED_STRING = dualChallenge({
  slug: "decode-nested-string",
  title: "Decode a Nested String",
  difficulty: "Advanced",
  topic: "Stacks of partial results",
  description: "Expand counted, bracketed groups that can nest inside each other.",
  prompt: [
    "An encoded string writes `k[text]` to mean `text` repeated `k` times. Groups can nest, so `3[a2[c]]` is `3[acc]`, which is `accaccacc`. Letters outside any group are copied as they are, and a count can have more than one digit: `12[ab]` is `ab` twelve times.",
    "Return the decoded string. The input is always well formed: every count is a positive integer followed immediately by `[`, the brackets are balanced, and digits appear only in counts.",
    "A count applies to its whole group, including any groups nested inside it, so the text of a group has to be finished before it can be repeated.",
  ],
  params: ["s"],
  constraints: [
    "`0 ≤ len(s) ≤ 1000`",
    "Letters are lowercase, and `1 ≤ k ≤ 300`",
    "The decoded string has at most 10⁵ characters",
  ],
  solutionNote:
    "When a `[` opens, push the text built so far together with the count in front of the bracket, and start an empty buffer for the group. When the matching `]` closes, pop them back: the finished group is repeated and appended to the text that was waiting. Reading the count one digit at a time (`count * 10 + digit`) is what makes `12[` mean twelve rather than two.",
  python: {
    fn: "decode_string",
    signature: "def decode_string(s: str) -> str",
    starter: `def decode_string(s: str) -> str:
    # On "[", save the text so far and the count; on "]", repeat and restore.
    return s
`,
    solution: `def decode_string(s: str) -> str:
    saved = []  # (text before the group, how many times to repeat the group)
    text, count = "", 0
    for ch in s:
        if ch.isdigit():
            count = count * 10 + int(ch)
        elif ch == "[":
            saved.append((text, count))
            text, count = "", 0
        elif ch == "]":
            before, times = saved.pop()
            text = before + text * times
        else:
            text += ch
    return text
`,
  },
  javascript: {
    fn: "decodeString",
    signature: "function decodeString(s: string): string",
    starter: `function decodeString(s) {
  // On "[", save the text so far and the count; on "]", repeat and restore.
  return s;
}
`,
    solution: `function decodeString(s) {
  const saved = []; // [text before the group, how many times to repeat it]
  let text = "";
  let count = 0;
  for (const ch of s) {
    if (ch >= "0" && ch <= "9") {
      count = count * 10 + Number(ch);
    } else if (ch === "[") {
      saved.push([text, count]);
      text = "";
      count = 0;
    } else if (ch === "]") {
      const [before, times] = saved.pop();
      text = before + text.repeat(times);
    } else {
      text += ch;
    }
  }
  return text;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "A group inside a group",
      args: ["3[a2[c]]"],
      expected: "accaccacc",
      example: "The inner group becomes acc first, then that is repeated three times.",
    },
    {
      id: "example2",
      name: "Groups side by side",
      args: ["2[abc]3[cd]ef"],
      expected: "abcabccdcdcdef",
      example: "Two groups one after the other, then plain letters.",
    },
    {
      id: "two-digit",
      name: "A two-digit count",
      args: ["12[xy]"],
      expected: "xyxyxyxyxyxyxyxyxyxyxyxy",
    },
    {
      id: "letters-around",
      name: "Letters inside and around groups",
      args: ["x2[y3[z]]w"],
      expected: "xyzzzyzzzw",
    },
    {
      id: "mixed",
      name: "Groups beside nested groups",
      args: ["3[z]2[2[y]pq4[2[jk]e1[f]]]ef"],
      expected: "zzzyypqjkjkefjkjkefjkjkefjkjkefyypqjkjkefjkjkefjkjkefjkjkefef",
    },
    { id: "plain", name: "No groups at all", args: ["plain"], expected: "plain" },
    { id: "empty", name: "An empty string", args: [""], expected: "" },
  ],
});

// ─── Basic Calculator ────────────────────────────────────────────────

const BASIC_CALCULATOR = dualChallenge({
  slug: "basic-calculator",
  title: "Basic Calculator",
  difficulty: "Advanced",
  topic: "Operator precedence",
  description: "Evaluate arithmetic with precedence and parentheses, without eval.",
  prompt: [
    "Evaluate `expression` and return its integer value. It contains non-negative integers, the operators `+`, `-`, `*` and `/`, parentheses, and spaces anywhere between tokens. `-` always has a number or a closing parenthesis on its left: there is no unary minus.",
    "The usual rules apply: `*` and `/` bind tighter than `+` and `-`, operators of equal precedence group from left to right (`8 - 3 - 2` is 3), and parentheses override both. Division truncates toward zero, so `7 / 2` is 3 and `(3 - 10) / 2` is -3, not -4.",
    "Do not use `eval`, `exec`, `Function` or any other way of handing the string to the language itself: the point is to write the evaluator. The last check is an expression of 120,000 characters, so it has to work in one pass.",
  ],
  params: ["expression"],
  constraints: [
    "`1 ≤ len(expression) ≤ 2 × 10⁵`",
    "The expression is valid and never divides by zero",
    "Every intermediate result is an integer below 2³¹ in absolute value",
  ],
  solutionNote:
    "Precedence becomes structure: an expression is a sum of terms, a term is a product of factors, and a factor is a number or a parenthesized expression. A function per level, or an operator stack that applies everything of equal or higher precedence before pushing the next operator, evaluates it in one pass. Combining left to right within a level is what makes `8 - 3 - 2` come out as 3 rather than 7. Truncate with `int(a / b)` or `Math.trunc(a / b)`: Python's `//` floors, which turns `-7 // 2` into -4.",
  python: {
    fn: "calculate",
    signature: "def calculate(expression: str) -> int",
    starter: `def calculate(expression: str) -> int:
    # A sum of terms; a term is a product of factors; a factor is a number or (...).
    return 0
`,
    solution: `import re


def calculate(expression: str) -> int:
    tokens = re.findall(r"\\d+|[-+*/()]", expression)
    pos = 0

    def peek():
        return tokens[pos] if pos < len(tokens) else None

    def take():
        nonlocal pos
        pos += 1
        return tokens[pos - 1]

    def expr():  # terms joined by + and -
        value = term()
        while peek() in ("+", "-"):
            op = take()
            rhs = term()
            value = value + rhs if op == "+" else value - rhs
        return value

    def term():  # factors joined by * and /
        value = factor()
        while peek() in ("*", "/"):
            op = take()
            rhs = factor()
            value = value * rhs if op == "*" else int(value / rhs)
        return value

    def factor():  # a number, or an expression in parentheses
        token = take()
        if token == "(":
            value = expr()
            take()  # the closing ")"
            return value
        return int(token)

    return expr()
`,
  },
  javascript: {
    fn: "calculate",
    signature: "function calculate(expression: string): number",
    starter: `function calculate(expression) {
  // Apply operators by precedence with a stack of values and a stack of operators.
  return 0;
}
`,
    solution: `function calculate(expression) {
  const tokens = expression.match(/\\d+|[-+*/()]/g) ?? [];
  const precedence = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const values = [];
  const ops = [];
  const applyTop = () => {
    const op = ops.pop();
    const b = values.pop();
    const a = values.pop();
    if (op === "+") values.push(a + b);
    else if (op === "-") values.push(a - b);
    else if (op === "*") values.push(a * b);
    else values.push(Math.trunc(a / b));
  };
  for (const token of tokens) {
    if (token === "(") {
      ops.push(token);
    } else if (token === ")") {
      while (ops.at(-1) !== "(") applyTop();
      ops.pop();
    } else if (token in precedence) {
      // Equal precedence applies first too: that is left-to-right grouping.
      while (ops.length && ops.at(-1) !== "(" && precedence[ops.at(-1)] >= precedence[token]) {
        applyTop();
      }
      ops.push(token);
    } else {
      values.push(Number(token));
    }
  }
  while (ops.length) applyTop();
  return values[0];
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Multiplication first",
      args: ["3+2*2"],
      expected: 7,
      example: "2 * 2 is worked out first, then added to 3.",
    },
    {
      id: "example2",
      name: "Parentheses and spaces",
      args: [" (1+(4+5+2)-3)+(6+8) "],
      expected: 23,
      example: "Spaces are ignored and each parenthesized part is worked out first: 9 + 14.",
    },
    {
      id: "left-to-right",
      name: "Equal precedence groups left to right",
      description: "Grouping from the right would give 39.",
      args: ["96 / 4 / 2 - 10 - 1"],
      expected: 1,
    },
    {
      id: "truncate",
      name: "Division truncates toward zero",
      description: "Floor division would give -4.",
      args: ["(3 - 10) / 2"],
      expected: -3,
    },
    {
      id: "nested",
      name: "Precedence inside parentheses",
      args: ["2 * (30 + 4 * (5 - 1)) / 5"],
      expected: 18,
    },
    { id: "number", name: "A lone number", args: ["42"], expected: 42 },
    {
      id: "long",
      name: "A 120,000-character expression",
      description: "Rewriting the string after every operation is quadratic at this length.",
      pyArgs: `"+".join(["2*3"] * 30000)`,
      jsArgs: `new Array(30000).fill("2*3").join("+")`,
      expected: 180000,
    },
  ],
});

// ─── Search a Rotated Array ──────────────────────────────────────────

const SEARCH_ROTATED_ARRAY = dualChallenge({
  slug: "search-rotated-array",
  title: "Search a Rotated Array",
  difficulty: "Advanced",
  topic: "Modified binary search",
  description: "Binary search a sorted list that has been rotated at an unknown point.",
  prompt: [
    "`nums` was sorted in ascending order with distinct values, then rotated: some number of values were moved from the front to the back, keeping their order, so `[0, 1, 2, 4, 5, 6, 7]` might have become `[4, 5, 6, 7, 0, 1, 2]`. You are not told by how much, and it may not have been rotated at all.",
    "Return the index of `target` in `nums`, or -1 if it is not there. Each call must run in O(log n): the last check makes ten thousand lookups in a list of a million values, which a linear scan cannot finish in time.",
  ],
  params: ["nums", "target"],
  constraints: [
    "`0 ≤ len(nums) ≤ 10⁶`",
    "The values are distinct integers",
    "The rotation is anywhere from 0 to `len(nums) - 1` places",
  ],
  solutionNote:
    "Split the range at the middle and at least one half is sorted; comparing its two ends tells you which. If `target` lies within the sorted half's range, search there, otherwise search the other half. Each step still discards half the range, so it stays O(log n) without first finding the rotation point. The `<=` in `nums[lo] <= nums[mid]` matters: when `lo` and `mid` coincide, that one-value half is the sorted one.",
  python: {
    fn: "search_rotated",
    signature: "def search_rotated(nums: list[int], target: int) -> int",
    starter: `def search_rotated(nums: list[int], target: int) -> int:
    # Halve the range; one half is always sorted, so check that one first.
    return -1
`,
    solution: `def search_rotated(nums: list[int], target: int) -> int:
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:  # the left half is sorted
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        else:  # the right half is sorted
            if nums[mid] < target <= nums[hi]:
                lo = mid + 1
            else:
                hi = mid - 1
    return -1
`,
    extra: [
      {
        id: "every-rotation",
        name: "Every rotation of a short list",
        description: "Each value, and a few missing ones, searched for in all eight rotations.",
        code: `base = [-7, -3, 0, 2, 5, 8, 13, 21]
for r in range(len(base)):
    nums = base[r:] + base[:r]
    for i, value in enumerate(nums):
        got = search_rotated(nums, value)
        assert got == i, f"search_rotated({nums!r}, {value}) returned {got!r}, expected {i}"
    for missing in (-10, -5, 1, 6, 30):
        got = search_rotated(nums, missing)
        assert got == -1, f"search_rotated({nums!r}, {missing}) returned {got!r}, expected -1"`,
      },
      {
        id: "many-lookups",
        name: "Ten thousand lookups in a million values",
        description: "Half the targets are present and half are missing; a linear scan per call is too slow.",
        code: `n, shift = 1_000_000, 333_333
nums = list(range(2 * shift, 2 * n, 2)) + list(range(0, 2 * shift, 2))  # 2 * ((i + shift) % n)
for v in range(0, n, 200):
    got = search_rotated(nums, 2 * v)
    want = (v - shift) % n
    assert got == want, f"search_rotated(nums, {2 * v}) returned {got!r}, expected {want}"
    got = search_rotated(nums, 2 * v + 1)
    assert got == -1, f"search_rotated(nums, {2 * v + 1}) returned {got!r}, expected -1"`,
      },
    ],
  },
  javascript: {
    fn: "searchRotated",
    signature: "function searchRotated(nums: number[], target: number): number",
    starter: `function searchRotated(nums, target) {
  // Halve the range; one half is always sorted, so check that one first.
  return -1;
}
`,
    solution: `function searchRotated(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    if (nums[mid] === target) return mid;
    const leftSorted = nums[lo] <= nums[mid];
    const inLeft = leftSorted
      ? nums[lo] <= target && target < nums[mid]
      : !(nums[mid] < target && target <= nums[hi]);
    if (inLeft) hi = mid - 1;
    else lo = mid + 1;
  }
  return -1;
}
`,
    extra: [
      {
        id: "every-rotation",
        name: "Every rotation of a short list",
        description: "Each value, and a few missing ones, searched for in all eight rotations.",
        code: `const base = [-7, -3, 0, 2, 5, 8, 13, 21];
for (let r = 0; r < base.length; r++) {
  const nums = [...base.slice(r), ...base.slice(0, r)];
  nums.forEach((value, i) => {
    const got = searchRotated(nums, value);
    if (got !== i) {
      throw new Error("searchRotated(" + JSON.stringify(nums) + ", " + value + ") returned " + JSON.stringify(got) + ", expected " + i);
    }
  });
  for (const missing of [-10, -5, 1, 6, 30]) {
    const got = searchRotated(nums, missing);
    if (got !== -1) {
      throw new Error("searchRotated(" + JSON.stringify(nums) + ", " + missing + ") returned " + JSON.stringify(got) + ", expected -1");
    }
  }
}`,
      },
      {
        id: "many-lookups",
        name: "Ten thousand lookups in a million values",
        description: "Half the targets are present and half are missing; a linear scan per call is too slow.",
        code: `const n = 1000000;
const shift = 333333;
const nums = Array.from({ length: n }, (_, i) => 2 * ((i + shift) % n));
for (let v = 0; v < n; v += 200) {
  const want = (((v - shift) % n) + n) % n;
  const hit = searchRotated(nums, 2 * v);
  if (hit !== want) {
    throw new Error("searchRotated(nums, " + 2 * v + ") returned " + JSON.stringify(hit) + ", expected " + want);
  }
  const miss = searchRotated(nums, 2 * v + 1);
  if (miss !== -1) {
    throw new Error("searchRotated(nums, " + (2 * v + 1) + ") returned " + JSON.stringify(miss) + ", expected -1");
  }
}`,
      },
    ],
  },
  cases: [
    {
      id: "example1",
      name: "The target is past the drop",
      args: [[4, 5, 6, 7, 0, 1, 2], 0],
      expected: 4,
      example: "The values drop from 7 to 0, and 0 is at index 4.",
    },
    {
      id: "example2",
      name: "The target is missing",
      args: [[4, 5, 6, 7, 0, 1, 2], 3],
      expected: -1,
      example: "3 is not in the list.",
    },
    {
      id: "not-rotated",
      name: "Not rotated at all",
      args: [[1, 3, 5, 7, 9, 11], 9],
      expected: 4,
    },
    { id: "two", name: "Two values", args: [[3, 1], 1], expected: 1 },
    { id: "one", name: "One value", args: [[5], 5], expected: 0 },
    { id: "empty", name: "An empty list", args: [[], 5], expected: -1 },
  ],
});

// ─── Largest Rectangle in a Histogram ────────────────────────────────

const LARGEST_RECTANGLE = dualChallenge({
  slug: "largest-rectangle",
  title: "Largest Rectangle in a Histogram",
  difficulty: "Advanced",
  topic: "Monotonic stacks",
  description: "Find the largest rectangle that fits under a bar chart.",
  prompt: [
    "`heights` describes a histogram of bars, each 1 unit wide, standing side by side. Return the area of the largest rectangle that fits entirely inside the bars: it spans some run of adjacent bars and is as tall as the shortest bar in that run.",
    "Bars can have height 0, and no rectangle can cross one. An empty histogram has area 0.",
    "Trying every run of bars, or growing a rectangle outward from every bar, is O(n²); the last check has 200,000 bars.",
  ],
  params: ["heights"],
  constraints: ["`0 ≤ len(heights) ≤ 2 × 10⁵`", "`0 ≤ heights[i] ≤ 10⁵`"],
  solutionNote:
    "The best rectangle exactly as tall as bar `i` stretches from the nearest shorter bar on its left to the nearest shorter bar on its right. A stack of indexes with increasing heights finds both in one pass: when a shorter bar arrives, each taller bar popped off has just met its right boundary, and the bar left beneath it on the stack is its left boundary. A final bar of height 0 flushes whatever is still on the stack, which is where a rising staircase finds its answer.",
  python: {
    fn: "largest_rectangle",
    signature: "def largest_rectangle(heights: list[int]) -> int",
    starter: `def largest_rectangle(heights: list[int]) -> int:
    # Keep a stack of bar indexes whose heights increase.
    return max(heights, default=0)
`,
    solution: `def largest_rectangle(heights: list[int]) -> int:
    best = 0
    stack = []  # indexes of bars, heights increasing from bottom to top
    for i, h in enumerate([*heights, 0]):  # the final 0 flushes the stack
        while stack and heights[stack[-1]] >= h:
            height = heights[stack.pop()]
            left = stack[-1] + 1 if stack else 0
            best = max(best, height * (i - left))
        stack.append(i)
    return best
`,
  },
  javascript: {
    fn: "largestRectangle",
    signature: "function largestRectangle(heights: number[]): number",
    starter: `function largestRectangle(heights) {
  // Keep a stack of bar indexes whose heights increase.
  return Math.max(0, ...heights);
}
`,
    solution: `function largestRectangle(heights) {
  let best = 0;
  const stack = []; // indexes of bars, heights increasing from bottom to top
  for (let i = 0; i <= heights.length; i++) {
    const h = i < heights.length ? heights[i] : 0; // the final 0 flushes the stack
    while (stack.length && heights[stack.at(-1)] >= h) {
      const height = heights[stack.pop()];
      const left = stack.length ? stack.at(-1) + 1 : 0;
      best = Math.max(best, height * (i - left));
    }
    stack.push(i);
  }
  return best;
}
`,
  },
  cases: [
    {
      id: "example1",
      name: "Two tall bars together",
      args: [[2, 1, 5, 6, 2, 3]],
      expected: 10,
      example: "The bars of height 5 and 6 hold a rectangle 5 tall and 2 wide.",
    },
    {
      id: "example2",
      name: "Tall and narrow or low and wide",
      args: [[2, 4]],
      expected: 4,
      example: "Either the 4 on its own, or both bars at height 2.",
    },
    {
      id: "equal",
      name: "Bars of equal height",
      args: [[3, 3, 3, 3]],
      expected: 12,
    },
    {
      id: "staircase",
      name: "A rising staircase",
      description: "No shorter bar ever arrives, so the answer is only found at the end.",
      args: [[1, 2, 3, 4, 5]],
      expected: 9,
    },
    {
      id: "zeros",
      name: "Zero-height gaps",
      description: "A bar of height 0 splits the histogram in two.",
      args: [[0, 2, 0, 3, 3, 0, 1]],
      expected: 6,
    },
    { id: "single", name: "One bar", args: [[7]], expected: 7 },
    { id: "empty", name: "No bars", args: [[]], expected: 0 },
    {
      id: "large",
      name: "A 200,000-bar pyramid",
      description: "Growing a rectangle outward from every bar is too slow here.",
      pyArgs: `list(range(1, 100001)) + list(range(100000, 0, -1))`,
      jsArgs: `[...Array.from({ length: 100000 }, (_, i) => i + 1), ...Array.from({ length: 100000 }, (_, i) => 100000 - i)]`,
      expected: 5000100000,
    },
  ],
});

export const CODE_STACKS_SEARCH: Challenge[] = [
  REMOVE_ADJACENT_DUPLICATES,
  SORT_BY_SEVERAL_KEYS,
  CUSTOM_SORT_ORDER,
  DAYS_UNTIL_WARMER,
  SIMPLIFY_PATH,
  MIN_STACK_OPS,
  VALID_STACK_SEQUENCE,
  FIRST_AND_LAST_POSITION,
  KTH_LARGEST,
  INSERT_INTERVAL,
  MEETING_ROOMS,
  DECODE_NESTED_STRING,
  BASIC_CALCULATOR,
  SEARCH_ROTATED_ARRAY,
  LARGEST_RECTANGLE,
];
