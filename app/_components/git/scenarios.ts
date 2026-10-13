/**
 * Starter repo fixtures, referenced by string id so MDX can name one without
 * importing a module. Each is a command script replayed through the same shell
 * the learner types into — no privileged seeding path, so a scenario can never
 * reach a state the learner could not.
 */

export interface GitScenario {
  id: string;
  label: string;
  description: string;
  /** Shell commands run at seed time, in order. */
  setup: string[];
  /**
   * A suggested first move: a few short steps shown once on load, ticked as
   * the reader does them. A sandbox with no suggested first move is a blank
   * page; this is not a level system, just the first things to try.
   */
  tryThis: { label: string; command: string }[];
}

/**
 * A command that writes `lines` to `path`, one line each. `printf '%s\n'`
 * repeats its format for every argument and never interprets the arguments
 * themselves, so source code needs no escaping beyond keeping single quotes
 * out of it.
 */
function writeFile(path: string, lines: string[]): string {
  if (lines.some((l) => l.includes("'"))) {
    throw new Error(`writeFile(${path}): single quotes cannot appear in a line`);
  }
  return `printf '%s\\n' ${lines.map((l) => `'${l}'`).join(" ")} > ${path}`;
}

const SHOP_TEST_HEAD = [
  "from pricing import order_total",
  "",
  "",
  "def test_total():",
  '    assert order_total([{"price": 250, "qty": 2}]) == 500',
];

/** The human-written starting point the `agent-session` agent builds on. */
const SHOP_BASE = [
  writeFile("README.md", ["# Shop", "", "Order totals, in cents."]),
  writeFile("pricing.py", [
    "def order_total(items):",
    '    """Total of price * qty for each item, in cents."""',
    '    return sum(item["price"] * item["qty"] for item in items)',
  ]),
  writeFile("test_pricing.py", SHOP_TEST_HEAD),
  writeFile("format.py", [
    "def cents_to_str(cents):",
    '    return "$" + format(cents / 100, ".2f")',
  ]),
  writeFile("report.py", [
    "from format import cents_to_str",
    "from pricing import order_total",
    "",
    "",
    "def summary(items):",
    '    return "Total: " + cents_to_str(order_total(items))',
  ]),
  "git add .",
  `git commit -m "Add order totals and a report"`,
];

export const SCENARIOS: GitScenario[] = [
  {
    id: "empty",
    label: "Empty folder",
    description: "No repository yet. Start with git init.",
    setup: [],
    tryThis: [
      { label: "Create a repository", command: "git init" },
      { label: "Create a file", command: "printf 'hello\\n' > notes.txt" },
      { label: "Stage it", command: "git add notes.txt" },
      { label: "Commit it", command: 'git commit -m "First commit"' },
    ],
  },
  {
    id: "linear-history",
    label: "Linear history",
    description: "Three commits on main, plus one unstaged edit.",
    setup: [
      "git init",
      `printf '# Project\\n\\nA small demo repository.\\n' > README.md`,
      "git add README.md",
      `git commit -m "Add README"`,
      `printf 'export const add = (a, b) => a + b;\\n' > math.js`,
      "git add math.js",
      `git commit -m "Add add()"`,
      `printf 'node_modules/\\n' > .gitignore`,
      "git add .gitignore",
      `git commit -m "Ignore node_modules"`,
      `printf '# Project\\n\\nA small demo repository.\\n\\nEdited but not staged.\\n' > README.md`,
    ],
    tryThis: [
      { label: "Stage the edit to README.md", command: "git add README.md" },
      { label: "Commit it", command: 'git commit -m "Describe the edit"' },
      { label: "See the history", command: "git log --oneline" },
    ],
  },
  {
    id: "staged-and-unstaged",
    label: "Staged and unstaged",
    description: "One file staged, one modified, one untracked: three areas at once.",
    setup: [
      "git init",
      `printf '# Notes\\n' > notes.md`,
      `printf 'const version = 1;\\n' > app.js`,
      "git add .",
      `git commit -m "Initial commit"`,
      `printf '# Notes\\n\\nA staged addition.\\n' > notes.md`,
      "git add notes.md",
      `printf 'const version = 2;\\n' > app.js`,
      `printf 'scratch\\n' > scratch.txt`,
    ],
    tryThis: [
      { label: "See where everything is", command: "git status" },
      { label: "Stage app.js too", command: "git add app.js" },
      { label: "Commit both", command: 'git commit -m "Bump version"' },
    ],
  },
  {
    id: "branching",
    label: "Two branches",
    description: "A feature branch one commit ahead of main.",
    setup: [
      "git init",
      `printf '# App\\n' > README.md`,
      "git add README.md",
      `git commit -m "Initial commit"`,
      "git checkout -b feature",
      `printf 'export const feature = true;\\n' > feature.js`,
      "git add feature.js",
      `git commit -m "Add feature flag"`,
      "git checkout main",
    ],
    tryThis: [
      { label: "Look at both branches", command: "git log --oneline --all" },
      { label: "Switch to feature", command: "git checkout feature" },
      { label: "Come back and merge it", command: "git merge feature" },
    ],
  },
  {
    id: "conflict-pending",
    label: "Conflict waiting to happen",
    description: "Two branches editing the same line. Merge them and see.",
    setup: [
      "git init",
      `printf 'title: Draft\\nauthor: unknown\\n' > config.yml`,
      "git add config.yml",
      `git commit -m "Add config"`,
      "git checkout -b rename",
      `printf 'title: Final\\nauthor: unknown\\n' > config.yml`,
      "git add config.yml",
      `git commit -m "Rename title to Final"`,
      "git checkout main",
      `printf 'title: Release\\nauthor: unknown\\n' > config.yml`,
      "git add config.yml",
      `git commit -m "Rename title to Release"`,
    ],
    tryThis: [
      { label: "Merge rename into main", command: "git merge rename" },
      { label: "Fix config.yml, then mark it resolved", command: "git add config.yml" },
      { label: "Finish the merge", command: 'git commit -m "Merge rename"' },
    ],
  },
  {
    // Working with Coding Agents, "Reading the Diff": the request was "give
    // orders of $100 or more a 10% discount, with tests, and change nothing
    // else". The first agent commit gets the threshold wrong (`>`), the
    // second edits the test that caught it, the third tidies a file nobody
    // asked about.
    id: "agent-session",
    label: "An agent's three commits",
    description: "A coding agent added a discount. Review what it actually changed.",
    setup: [
      "git init",
      ...SHOP_BASE,
      'git config user.name "Coding Agent"',
      "git config user.email agent@example.com",
      writeFile("pricing.py", [
        "DISCOUNT_THRESHOLD = 10_000  # cents",
        "DISCOUNT_RATE = 0.10",
        "",
        "",
        "def order_total(items):",
        '    """Total of price * qty for each item, in cents, after any discount."""',
        '    total = sum(item["price"] * item["qty"] for item in items)',
        "    if total > DISCOUNT_THRESHOLD:",
        "        total = round(total * (1 - DISCOUNT_RATE))",
        "    return total",
      ]),
      writeFile("test_pricing.py", [
        ...SHOP_TEST_HEAD,
        "",
        "",
        "def test_discount_above_threshold():",
        '    assert order_total([{"price": 6_000, "qty": 2}]) == 10_800',
        "",
        "",
        "def test_discount_at_threshold():",
        '    assert order_total([{"price": 5_000, "qty": 2}]) == 9_000',
      ]),
      "git add pricing.py test_pricing.py",
      `git commit -m 'Add 10% discount on orders of $100 or more'`,
      writeFile("test_pricing.py", [
        ...SHOP_TEST_HEAD,
        "",
        "",
        "def test_discount_above_threshold():",
        '    assert order_total([{"price": 6_000, "qty": 2}]) == 10_800',
        "",
        "",
        "def test_discount_at_threshold():",
        '    assert order_total([{"price": 5_000, "qty": 2}]) == 10_000',
      ]),
      "git add test_pricing.py",
      `git commit -m "Fix failing discount test"`,
      writeFile("format.py", [
        "def format_cents(cents: int) -> str:",
        '    """Render a number of cents as dollars, e.g. 1050 -> $10.50."""',
        '    return f"${cents / 100:,.2f}"',
      ]),
      writeFile("report.py", [
        "from format import format_cents",
        "from pricing import order_total",
        "",
        "",
        "def summary(items):",
        '    return "Total: " + format_cents(order_total(items))',
      ]),
      "git add format.py report.py",
      `git commit -m "Tidy up formatting helpers"`,
      "git config --unset user.name",
      "git config --unset user.email",
    ],
    tryThis: [
      { label: "See the agent's commits", command: "git log --oneline" },
      { label: "List every file the session touched", command: "git diff HEAD~3 --stat" },
      { label: "Read the second commit", command: "git show HEAD~1" },
    ],
  },
  {
    // Working with Coding Agents, "Project: Ship a Small Feature": an agent
    // added a coupon on its own branch. Its summary says shipping is not
    // discounted; its code discounts shipping, and its test was written to
    // match the code.
    id: "agent-branch",
    label: "An agent's branch, waiting for review",
    description: "A coding agent added a coupon on a branch. Review it, then merge it or delete it.",
    setup: [
      "git init",
      writeFile("README.md", ["# Shop", "", "Order totals, in cents."]),
      writeFile("pricing.py", [
        "SHIPPING = 499  # cents, flat rate",
        "",
        "",
        "def order_total(items):",
        '    """Items at price * qty, plus shipping, in cents."""',
        '    subtotal = sum(item["price"] * item["qty"] for item in items)',
        "    return subtotal + SHIPPING",
      ]),
      writeFile("test_pricing.py", [
        "from pricing import order_total",
        "",
        "",
        "def test_total_includes_shipping():",
        '    assert order_total([{"price": 250, "qty": 2}]) == 999',
      ]),
      "git add .",
      `git commit -m "Add order totals with flat shipping"`,
      "git checkout -b agent/coupon",
      'git config user.name "Coding Agent"',
      "git config user.email agent@example.com",
      writeFile("pricing.py", [
        "SHIPPING = 499  # cents, flat rate",
        'COUPONS = {"SAVE10": 0.10}',
        "",
        "",
        "def order_total(items, coupon=None):",
        '    """Items at price * qty, plus shipping, less any coupon, in cents."""',
        '    subtotal = sum(item["price"] * item["qty"] for item in items)',
        "    total = subtotal + SHIPPING",
        "    if coupon in COUPONS:",
        "        total = round(total * (1 - COUPONS[coupon]))",
        "    return total",
      ]),
      writeFile("test_pricing.py", [
        "from pricing import order_total",
        "",
        "",
        "def test_total_includes_shipping():",
        '    assert order_total([{"price": 250, "qty": 2}]) == 999',
        "",
        "",
        "def test_save10_coupon():",
        '    assert order_total([{"price": 1_000, "qty": 1}], coupon="SAVE10") == 1_349',
      ]),
      "git add pricing.py test_pricing.py",
      `git commit -m "Add SAVE10 coupon"`,
      "git config --unset user.name",
      "git config --unset user.email",
      "git checkout main",
    ],
    tryThis: [
      { label: "See both branches", command: "git log --oneline --all" },
      { label: "Read what the agent changed", command: "git diff main..agent/coupon" },
      { label: "Throw the branch away", command: "git branch -D agent/coupon" },
    ],
  },
];

export const DEFAULT_SCENARIO = "linear-history";

export const scenarioById = (id: string): GitScenario =>
  SCENARIOS.find((s) => s.id === id) ?? SCENARIOS.find((s) => s.id === DEFAULT_SCENARIO)!;
