/**
 * Multi-step Python challenges: small applications.
 *
 * Each of these is a program with a job a person would recognise: split a
 * holiday's bills, fill in a form letter, referee a game, find a meeting time,
 * fix a typo, check a sudoku, answer "5 ft in m". What ties them together is
 * the shape of the build. Step 1 is the data model, the one rule everything
 * else leans on (a balance, a placeholder, a line of three, an interval in
 * minutes). Step 2 is the logic that uses it. Step 3 is the part a user would
 * actually see, and it is short precisely because the first two steps did
 * the work.
 *
 * As in the other multi-step modules, each accepted program is a shared
 * constant, and the next step's starter is that program plus a stub, so a fix
 * to step 1 reaches every later step. Where a check is "call this, compare
 * the result", it is written as a `CallCase` and rendered by `pyCases`;
 * anything that needs a loop or an invariant is a hand-written `CodeTest`.
 * `__tests__/challengeSolutions` runs every step under `python3`.
 */

import { codeSteps } from "./authoring";
import { pyCases, pyLiteral, type Value } from "./cases";
import type { Challenge } from "./types";

// ─── Expense Splitter ────────────────────────────────────────────────

const EXPENSE_BALANCES = `def balances(expenses: list[list]) -> dict[str, int]:
    net = {}
    for payer, amount, participants in expenses:
        net[payer] = net.get(payer, 0) + amount
        share, leftover = divmod(amount, len(participants))
        for i, person in enumerate(participants):
            owed = share + (1 if i < leftover else 0)
            net[person] = net.get(person, 0) - owed
    return net
`;

const EXPENSE_SETTLE = `${EXPENSE_BALANCES}

def settle(expenses: list[list]) -> list[list]:
    remaining = {name: cents for name, cents in balances(expenses).items() if cents != 0}
    transfers = []
    while remaining:
        debtor = min(remaining, key=lambda name: (remaining[name], name))
        creditor = min(remaining, key=lambda name: (-remaining[name], name))
        amount = min(-remaining[debtor], remaining[creditor])
        transfers.append([debtor, creditor, amount])
        remaining[debtor] += amount
        remaining[creditor] -= amount
        for name in (debtor, creditor):
            if remaining[name] == 0:
                del remaining[name]
    return transfers
`;

/** Three friends, three receipts: caz and ben both end up owing ana. */
const TRIP: Value = [
  ["ana", 9000, ["ana", "ben", "caz"]],
  ["ben", 3000, ["ana", "ben", "caz"]],
  ["caz", 1000, ["ben", "caz"]],
];

/** Two creditors, so one debtor's payment has to be split between them. */
const CABIN: Value = [
  ["dev", 12000, ["ana", "ben", "caz", "dev"]],
  ["ana", 4000, ["ana", "ben"]],
  ["eli", 2500, ["caz", "eli"]],
];

const EXPENSE_SPLITTER = codeSteps(
  {
    slug: "expense-splitter",
    title: "Expense Splitter",
    difficulty: "Intermediate",
    topic: "Balancing ledgers",
    language: "python",
    description:
      "Split shared expenses fairly to the cent, work out who pays whom, then write the settlement up.",
    solutionNote:
      "Everything stays in integer cents from the first receipt to the last line of the summary, and that is what lets the ledger balance exactly. The leftover cents are handed out rather than rounded away, so the balances sum to zero, so the greedy settlement always finds a partner for every debt and stops. Dollars only appear at the very end, as text.",
  },
  [
    {
      title: "Work out the balances",
      short: "Balances",
      solutionNote:
        "`divmod` gives the whole share and the leftover in one call, and handing the leftover out a cent at a time is what keeps the ledger exact. Rounding every share instead turns `1000` split three ways into three shares of `333`, and a cent disappears. Working in integer cents is what makes \"the balances sum to zero\" something you can assert rather than approximate.",
      signature: "def balances(expenses: list[list]) -> dict[str, int]",
      prompt: [
        "A shared trip keeps a list of expenses. Each one is `[payer, amount_cents, participants]`: who paid, how much in cents, and the people the cost is split between. The payer may or may not be one of the participants.",
        "Return each person's net balance in cents: what they paid, minus their share of every expense they took part in. Positive means the group owes them money; negative means they owe the group. Everyone named in any expense gets an entry, even when it nets to zero.",
        "Split each amount with integer division. When it does not divide exactly, the leftover cents go one each to the first participants in the order they are listed, so `1000` split three ways is `334`, `333` and `333`. That way the balances always sum to exactly zero.",
      ],
      starter: `def balances(expenses: list[list]) -> dict[str, int]:
    net = {}
    for payer, amount, participants in expenses:
        # Credit the payer, then charge each participant their share.
        pass
    return net
`,
      solution: EXPENSE_BALANCES,
      tests: [
        ...pyCases("balances", [
          {
            id: "trip",
            name: "Three people, three expenses",
            args: [TRIP],
            expected: { ana: 5000, ben: -1500, caz: -3500 },
          },
          {
            id: "payer-outside",
            name: "The payer is not always a participant",
            args: [[["dev", 900, ["ana", "caz"]]]],
            expected: { dev: 900, ana: -450, caz: -450 },
          },
          {
            id: "leftover",
            name: "Leftover cents go to the first participants listed",
            description: "1001 split three ways is 334, 334 and 333, in the order caz, ben, ana.",
            args: [[["ana", 1001, ["caz", "ben", "ana"]]]],
            expected: { ana: 668, caz: -334, ben: -334 },
          },
          {
            id: "even",
            name: "Someone who breaks even still appears",
            args: [[["eli", 500, ["eli"]]]],
            expected: { eli: 0 },
          },
          {
            id: "empty",
            name: "No expenses",
            args: [[]],
            expected: {},
          },
        ]),
        {
          id: "sums-to-zero",
          name: "Balances are whole cents and sum to zero",
          description: "Rounding each share, instead of handing out the leftover cents, loses a cent.",
          code: `expenses = [
    ["ana", 1000, ["ana", "ben", "caz"]],
    ["ben", 2002, ["ana", "ben", "caz"]],
    ["caz", 1, ["ana", "ben"]],
    ["dev", 9999, ["ana", "ben", "caz", "dev", "eli", "fay", "gus"]],
]
got = balances(expenses)
assert all(isinstance(v, int) for v in got.values()), f"balances should be whole cents, got {got}"
assert sum(got.values()) == 0, f"balances sum to {sum(got.values())}, not 0: {got}"`,
        },
      ],
    },
    {
      title: "Settle up",
      short: "Settle",
      solutionNote:
        "Moving the smaller of the two amounts is what guarantees progress: every transfer zeroes at least one person, so the loop ends after fewer transfers than there are people. The tie-break has to live in the key, `(remaining[name], name)`, because `min` on the amount alone returns whichever tied name the dictionary happened to hold first, and that is just the order the receipts were typed in.",
      signature: "def settle(expenses: list[list]) -> list[list]",
      prompt: [
        "Now settle up. Return a list of transfers `[from, to, cents]` that brings every balance to zero.",
        "Build it greedily: the person who owes the most pays the person who is owed the most, as much as can pass between them (the smaller of the two amounts). Then choose the pair again from the updated balances, and repeat until everyone is square: after a partial payment, the person who now owes the most may be someone else. When two people owe, or are owed, the same amount, the alphabetically first name goes first.",
        "Someone whose balance is already zero never appears in a transfer, and no expenses means no transfers.",
      ],
      starter: `${EXPENSE_BALANCES}

def settle(expenses: list[list]) -> list[list]:
    remaining = {name: cents for name, cents in balances(expenses).items() if cents != 0}
    transfers = []
    # The largest debtor pays the largest creditor, until nobody is left.
    return transfers
`,
      solution: EXPENSE_SETTLE,
      tests: [
        ...pyCases("settle", [
          {
            id: "trip",
            name: "Two people pay one",
            args: [TRIP],
            expected: [
              ["caz", "ana", 3500],
              ["ben", "ana", 1500],
            ],
          },
          {
            id: "split-payment",
            name: "A debt can be paid to two people",
            description: "caz owes more than dev is still owed after ben pays, so caz's last 250 goes to eli, after ana, who by then owes more.",
            args: [CABIN],
            expected: [
              ["ben", "dev", 5000],
              ["caz", "dev", 4000],
              ["ana", "eli", 1000],
              ["caz", "eli", 250],
            ],
          },
          {
            id: "ties",
            name: "Equal debts settle alphabetically",
            description: "caz is listed before ben, but ben goes first.",
            args: [[["ana", 900, ["caz", "ben", "ana"]]]],
            expected: [
              ["ben", "ana", 300],
              ["caz", "ana", 300],
            ],
          },
          {
            id: "square",
            name: "Nobody owes anything",
            args: [[["eli", 500, ["eli"]]]],
            expected: [],
          },
          {
            id: "empty",
            name: "No expenses",
            args: [[]],
            expected: [],
          },
        ]),
        {
          id: "zeroes-balances",
          name: "The transfers bring every balance to zero",
          code: `expenses = [
    ["ana", 4250, ["ana", "ben", "caz", "dev"]],
    ["ben", 1999, ["caz", "dev"]],
    ["dev", 12000, ["ana", "ben", "caz", "dev", "eli"]],
    ["eli", 777, ["ana", "eli"]],
]
net = balances(expenses)
for debtor, creditor, cents in settle(expenses):
    assert cents > 0, f"a transfer of {cents} cents"
    net[debtor] += cents
    net[creditor] -= cents
assert all(v == 0 for v in net.values()), f"left over after settling: {net}"`,
        },
        {
          id: "earlier-steps",
          name: "balances still works",
          code: `got = balances([["dev", 900, ["ana", "caz"]]])
assert got == {"dev": 900, "ana": -450, "caz": -450}, f"got {got}"`,
        },
      ],
    },
    {
      title: "Write it up",
      short: "Summary",
      solutionNote:
        "`cents // 100` and `cents % 100` split an amount into dollars and cents without the value ever becoming a float, and padding the cents to two digits is what turns `5` into `05`. The obvious `str(cents / 100)` prints `2.5` for 250 cents, which reads fine in a debugger and wrong on a receipt.",
      signature: "def summary(expenses: list[list]) -> list[str]",
      prompt: [
        'Finally, turn the transfers into lines a person can read, such as `"ben pays ana $15.00"`, in the order `settle` produced them.',
        "Write `dollars` first. An amount is always dollars, a dot and two digits of cents: `250` cents is `$2.50` and `5` cents is `$0.05`. Build the text from `cents // 100` and `cents % 100`; `str(cents / 100)` gives `2.5`.",
        'When there is nothing to settle, `summary` returns `["Nothing to settle"]`.',
      ],
      starter: `${EXPENSE_SETTLE}

def dollars(cents: int) -> str:
    # Whole dollars, a dot, then exactly two digits of cents.
    return "$" + str(cents / 100)


def summary(expenses: list[list]) -> list[str]:
    lines = []
    for debtor, creditor, cents in settle(expenses):
        # "ben pays ana $15.00"
        pass
    return lines
`,
      solution: `${EXPENSE_SETTLE}

def dollars(cents: int) -> str:
    return "$" + f"{cents // 100}.{cents % 100:02d}"


def summary(expenses: list[list]) -> list[str]:
    lines = [
        debtor + " pays " + creditor + " " + dollars(cents)
        for debtor, creditor, cents in settle(expenses)
    ]
    return lines or ["Nothing to settle"]
`,
      tests: [
        ...pyCases("dollars", [
          { id: "dollars-cents", name: "Two digits of cents", args: [250], expected: "$2.50" },
          { id: "dollars-small", name: "Less than a dollar", args: [5], expected: "$0.05" },
          { id: "dollars-large", name: "A large amount", args: [123456], expected: "$1234.56" },
        ]),
        ...pyCases("summary", [
          {
            id: "trip",
            name: "One line per transfer",
            args: [TRIP],
            expected: ["caz pays ana $35.00", "ben pays ana $15.00"],
          },
          {
            id: "cabin",
            name: "Transfers in the order they were settled",
            args: [CABIN],
            expected: [
              "ben pays dev $50.00",
              "caz pays dev $40.00",
              "ana pays eli $10.00",
              "caz pays eli $2.50",
            ],
          },
          {
            id: "square",
            name: "Everyone is already square",
            args: [[["eli", 500, ["eli"]]]],
            expected: ["Nothing to settle"],
          },
          {
            id: "empty",
            name: "No expenses at all",
            args: [[]],
            expected: ["Nothing to settle"],
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert balances([["ana", 1001, ["caz", "ben", "ana"]]]) == {"ana": 668, "caz": -334, "ben": -334}
assert settle([["ana", 900, ["caz", "ben", "ana"]]]) == [["ben", "ana", 300], ["caz", "ana", 300]]`,
        },
      ],
    },
  ],
);

// ─── Template Engine ─────────────────────────────────────────────────

const TEMPLATE_HEAD = `import re

PLACEHOLDER = re.compile(r"\\{\\{(.*?)\\}\\}")
`;

const TEMPLATE_RENDER = `def render(template: str, context: dict) -> str:
    return PLACEHOLDER.sub(lambda match: lookup(match.group(1), context), template)
`;

const TEMPLATE_LOOKUP_NAME = `def lookup(expression: str, context: dict) -> str:
    return str(context[expression.strip()])
`;

const TEMPLATE_PARSE_DEFAULT = `def parse_default(pipe: str) -> str:
    text = pipe[len("default:"):].strip()
    if len(text) < 2 or text[0] != '"' or text[-1] != '"':
        raise ValueError("a default needs double quotes: " + pipe)
    return text[1:-1]
`;

const TEMPLATE_LOOKUP_DEFAULT = `def lookup(expression: str, context: dict) -> str:
    name, *pipes = [part.strip() for part in expression.split("|")]
    if name in context:
        return str(context[name])
    if pipes and pipes[0].startswith("default:"):
        return parse_default(pipes[0])
    raise KeyError(name)
`;

const TEMPLATE_FILTERS = `FILTERS = {"upper": str.upper, "lower": str.lower, "title": str.title}
`;

const TEMPLATE_V1 = `${TEMPLATE_HEAD}

${TEMPLATE_LOOKUP_NAME}

${TEMPLATE_RENDER}`;

const TEMPLATE_V2 = `${TEMPLATE_HEAD}

${TEMPLATE_PARSE_DEFAULT}

${TEMPLATE_LOOKUP_DEFAULT}

${TEMPLATE_RENDER}`;

const TEMPLATE_ENGINE = codeSteps(
  {
    slug: "template-engine",
    title: "Template Engine",
    difficulty: "Intermediate",
    topic: "String rendering",
    language: "python",
    description:
      "Fill placeholders in a text template from a dictionary, then add default values and chained filters.",
    solutionNote:
      "Every feature lives in `lookup`, which turns the text between the braces into a string, while `render` stays a single `re.sub` pass that never looks at its own output. That split is why defaults and filters could be added without touching the matching, and why no value, however many braces it contains, is ever treated as template.",
  },
  [
    {
      title: "Fill in the placeholders",
      short: "Fill",
      solutionNote:
        "`re.sub` with a function replaces every match in one left-to-right pass and never rescans what it inserted, which is why a value containing `{{b}}` comes out literally. The lazy `.*?` matters just as much: a greedy `.*` swallows everything from the first `{{` to the last `}}` on the line and looks up one long nonsense name.",
      signature: "def render(template: str, context: dict) -> str",
      prompt: [
        "Write a tiny template renderer. A placeholder is a name between double braces, `{{name}}`, optionally with spaces inside, so `{{ name }}` is the same placeholder. `render` replaces each one with `str(context[name])`, which means numbers work too. Single braces are ordinary text.",
        "A name the context does not have raises `KeyError`: a letter that fails is better than one that goes out reading \"Dear ,\". Replace everything in one pass with `re.sub` and a function as the replacement, so a value that happens to contain braces is printed as it is rather than expanded again. Match lazily (`.*?`), or two placeholders on one line become one match.",
      ],
      starter: `import re


def lookup(expression: str, context: dict) -> str:
    # The text between the braces, trimmed, is a key into the context.
    return ""


def render(template: str, context: dict) -> str:
    # One re.sub pass, with a function as the replacement.
    return template
`,
      solution: TEMPLATE_V1,
      tests: pyCases("render", [
        {
          id: "fill",
          name: "A placeholder is filled",
          args: ["Hello, {{name}}!", { name: "Ada" }],
          expected: "Hello, Ada!",
        },
        {
          id: "spaces",
          name: "Two placeholders, spaces inside the braces",
          description: "A greedy match would read both as one placeholder.",
          args: ["{{ first }} {{last}}", { first: "Grace", last: "Hopper" }],
          expected: "Grace Hopper",
        },
        {
          id: "str",
          name: "Values are converted with str",
          args: ["{{count}} seats left, {{count}} on hold", { count: 3 }],
          expected: "3 seats left, 3 on hold",
        },
        {
          id: "no-rescan",
          name: "An inserted value is never expanded again",
          description: "Replacing one key at a time with str.replace would turn {{b}} into oops.",
          args: ["{{a}}", { a: "{{b}}", b: "oops" }],
          expected: "{{b}}",
        },
        {
          id: "single-braces",
          name: "Single braces are just text",
          args: ["{name} and {{name}}", { name: "Ola" }],
          expected: "{name} and Ola",
        },
        {
          id: "plain",
          name: "Text without placeholders is unchanged",
          args: ["No braces here.", {}],
          expected: "No braces here.",
        },
        {
          id: "unknown",
          name: "An unknown name raises KeyError",
          args: ["Dear {{title}} {{name}}", { name: "Lin" }],
          throws: { py: "KeyError" },
        },
      ]),
    },
    {
      title: "Add default values",
      short: "Defaults",
      solutionNote:
        "Asking `name in context` before reaching for the default, rather than testing the value for truthiness, is what lets a deliberately empty value through: `context.get(name) or default` would replace an empty note with `n/a`. Requiring the quotes gives the default visible edges, so an empty default and a forgotten one are different things.",
      signature: "def parse_default(pipe: str) -> str",
      prompt: [
        'Missing names should not always be fatal. Support a default after a pipe: `{{ nickname|default:"friend" }}` renders the context\'s `nickname` when there is one and `friend` when there is not.',
        'Write `parse_default`, which takes the text after the pipe, such as `default:"friend"`, and returns what is inside the quotes. The quotes are required, so `default:friend` raises `ValueError`, while `default:""` is a legitimate empty default. Spaces around the quoted text are ignored.',
        "Then use it in `lookup`. A name that is present always wins, even when its value is an empty string, and a missing name with no default still raises `KeyError`. Defaults contain no `|` and no `}`.",
      ],
      starter: `${TEMPLATE_HEAD}

def parse_default(pipe: str) -> str:
    # 'default:"friend"' gives 'friend'; the quotes are required.
    return ""


${TEMPLATE_LOOKUP_NAME}

${TEMPLATE_RENDER}`,
      solution: TEMPLATE_V2,
      tests: [
        ...pyCases("parse_default", [
          {
            id: "parse",
            name: "The text inside the quotes",
            args: ['default: "dear reader"'],
            expected: "dear reader",
          },
          {
            id: "parse-empty",
            name: "An empty default is allowed",
            args: ['default:""'],
            expected: "",
          },
          {
            id: "parse-unquoted",
            name: "A default without quotes raises ValueError",
            args: ["default:friend"],
            throws: { py: "ValueError" },
          },
        ]),
        ...pyCases("render", [
          {
            id: "missing",
            name: "A missing name uses its default",
            args: ['Hi {{ nickname|default:"friend" }}!', {}],
            expected: "Hi friend!",
          },
          {
            id: "present",
            name: "A present name ignores its default",
            args: ['Hi {{ nickname|default:"friend" }}!', { nickname: "Bea" }],
            expected: "Hi Bea!",
          },
          {
            id: "present-empty",
            name: "A present but empty value still wins",
            description: "Falling back whenever the value is falsy would print n/a here.",
            args: ['[{{ note|default:"n/a" }}]', { note: "" }],
            expected: "[]",
          },
          {
            id: "no-default",
            name: "No default still raises KeyError",
            args: ['{{ city }}, {{ zip|default:"" }}', {}],
            throws: { py: "KeyError" },
          },
          {
            id: "earlier-steps",
            name: "Plain placeholders still work",
            args: ["{{ first }} {{last}}", { first: "Grace", last: "Hopper" }],
            expected: "Grace Hopper",
          },
        ]),
      ],
    },
    {
      title: "Chain filters",
      short: "Filters",
      solutionNote:
        "A dictionary from filter name to function turns the chain into a loop, `value = FILTERS[name](value)`, and a new filter becomes one more entry in the table rather than another branch. Running that loop in the order the pipes were written is the whole of \"left to right\"; composing them the other way round is the classic bug, and `lower|title` is the pair that shows it.",
      signature: "def apply_filters(value: str, filters: list[str]) -> str",
      prompt: [
        "Add filters: `{{ name|upper }}`, `{{ name|lower }}` and `{{ name|title }}` apply the string methods of the same name. Filters chain and run left to right, so `{{ name|lower|title }}` lowercases first and then title-cases the result.",
        'A default, when there is one, comes straight after the name, and it passes through the filters like any other value: `{{ nickname|default:"friend"|title }}` renders `Friend`.',
        "Write `apply_filters`, which runs a list of filter names over a value in order and raises `ValueError` for a name it does not know, then call it from `lookup`. A filter does not excuse a missing name: without a default, that is still a `KeyError`.",
      ],
      starter: `${TEMPLATE_HEAD}

${TEMPLATE_FILTERS}

def apply_filters(value: str, filters: list[str]) -> str:
    # Left to right; an unknown filter is a ValueError.
    return value


${TEMPLATE_PARSE_DEFAULT}

${TEMPLATE_LOOKUP_DEFAULT}

${TEMPLATE_RENDER}`,
      solution: `${TEMPLATE_HEAD}

${TEMPLATE_FILTERS}

def apply_filters(value: str, filters: list[str]) -> str:
    for name in filters:
        if name not in FILTERS:
            raise ValueError("unknown filter: " + name)
        value = FILTERS[name](value)
    return value


${TEMPLATE_PARSE_DEFAULT}

def lookup(expression: str, context: dict) -> str:
    name, *pipes = [part.strip() for part in expression.split("|")]
    default = None
    if pipes and pipes[0].startswith("default:"):
        default = parse_default(pipes[0])
        pipes = pipes[1:]
    if name in context:
        value = str(context[name])
    elif default is not None:
        value = default
    else:
        raise KeyError(name)
    return apply_filters(value, pipes)


${TEMPLATE_RENDER}`,
      tests: [
        ...pyCases("apply_filters", [
          {
            id: "one-filter",
            name: "A single filter",
            args: ["ada lovelace", ["title"]],
            expected: "Ada Lovelace",
          },
          {
            id: "left-to-right",
            name: "Filters run left to right",
            description: "Applied right to left, lower then title would give mcdonald.",
            args: ["mcDONALD", ["lower", "title"]],
            expected: "Mcdonald",
          },
          {
            id: "unknown-filter",
            name: "An unknown filter raises ValueError",
            args: ["x", ["reverse"]],
            throws: { py: "ValueError" },
          },
        ]),
        ...pyCases("render", [
          {
            id: "default-filtered",
            name: "A default passes through the filters",
            args: ['Hi {{ nickname|default:"friend"|title }}!', {}],
            expected: "Hi Friend!",
          },
          {
            id: "both-ways",
            name: "Different filters on the same name",
            args: ["{{ name|upper }} / {{ name|lower }}", { name: "Ren Ito" }],
            expected: "REN ITO / ren ito",
          },
          {
            id: "value-filtered",
            name: "The context value is filtered, not the default",
            args: ['{{ team|default:"ops"|upper }}', { team: "data" }],
            expected: "DATA",
          },
          {
            id: "missing-filtered",
            name: "A filter does not excuse a missing name",
            args: ["{{ city|upper }}", {}],
            throws: { py: "KeyError" },
          },
          {
            id: "earlier-steps",
            name: "Plain placeholders and defaults still work",
            args: ['{{a}} {{ b|default:"-" }}', { a: "{{b}}" }],
            expected: "{{b}} -",
          },
        ]),
      ],
    },
  ],
);

// ─── Gradebook ───────────────────────────────────────────────────────

const GRADE_AVERAGES = `def averages(scores: list[list]) -> dict[str, float]:
    totals = {}
    counts = {}
    for student, score in scores:
        totals[student] = totals.get(student, 0) + score
        counts[student] = counts.get(student, 0) + 1
    return {student: round(totals[student] / counts[student], 1) for student in totals}
`;

const GRADE_LETTERS = `${GRADE_AVERAGES}

CUTOFFS = [(90, "A"), (80, "B"), (70, "C"), (60, "D")]


def letter(average: float) -> str:
    for minimum, grade in CUTOFFS:
        if average >= minimum:
            return grade
    return "F"


def letter_grades(scores: list[list]) -> dict[str, str]:
    return {student: letter(average) for student, average in averages(scores).items()}
`;

/** Three students' assignments, recorded in the order they were marked. */
const TERM: Value = [
  ["Maya", 91],
  ["Theo", 78],
  ["Maya", 85],
  ["Iris", 88],
  ["Theo", 84],
  ["Maya", 97],
];

const GRADEBOOK = codeSteps(
  {
    slug: "gradebook",
    title: "Gradebook",
    difficulty: "Beginner",
    topic: "Aggregating records",
    language: "python",
    description:
      "Average each student's scores, grade them against cut-offs, then print a ranked class report.",
    solutionNote:
      "Each step is a pass over the output of the one before: records become averages, averages become letters, and letters plus a sort become the report. The only subtle part is the ranking, where `enumerate` supplies a position and a tie decides whether that position becomes the rank.",
  },
  [
    {
      title: "Average each student",
      short: "Averages",
      solutionNote:
        "A running total and a count per student are all an average needs, and a dictionary keyed by name is what gathers a student's records wherever they sit in the list. Rounding happens once, at the end, on the true average; rounding along the way lets small errors build up.",
      signature: "def averages(scores: list[list]) -> dict[str, float]",
      prompt: [
        "A gradebook is a list of `[student, score]` records, one per assignment, in the order they were marked. Return each student's average score, rounded to 1 decimal place.",
        "Each student appears once in the result however many records they have. No records means an empty dictionary.",
      ],
      starter: `def averages(scores: list[list]) -> dict[str, float]:
    totals = {}
    counts = {}
    for student, score in scores:
        # Keep a running total and a count per student.
        pass
    return {}
`,
      solution: GRADE_AVERAGES,
      tests: pyCases("averages", [
        {
          id: "term",
          name: "Scores are averaged per student",
          args: [TERM],
          expected: { Maya: 91.0, Theo: 81.0, Iris: 88.0 },
        },
        {
          id: "rounded",
          name: "Averages are rounded to 1 decimal place",
          description: "263 / 3 is 87.666..., which rounds up to 87.7.",
          args: [[["Omar", 90], ["Omar", 85], ["Omar", 88]]],
          expected: { Omar: 87.7 },
        },
        {
          id: "half",
          name: "A half point is kept",
          args: [[["Zoe", 80], ["Zoe", 85]]],
          expected: { Zoe: 82.5 },
        },
        {
          id: "single",
          name: "A single score is its own average",
          args: [[["Lena", 72]]],
          expected: { Lena: 72.0 },
        },
        {
          id: "empty",
          name: "No records",
          args: [[]],
          expected: {},
        },
      ]),
    },
    {
      title: "Give letter grades",
      short: "Letters",
      solutionNote:
        "Scanning the cut-offs from the top and stopping at the first one the average reaches is what makes the table read like the rule: order matters, and checking from the bottom up would hand every passing student a `D`. Keeping the cut-offs as data rather than an `if` ladder means a school that changes its scale edits one line.",
      signature: "def letter_grades(scores: list[list]) -> dict[str, str]",
      prompt: [
        "Turn averages into letter grades. The cut-offs are in `CUTOFFS`, highest first: 90 and above is an `A`, 80 and above a `B`, 70 a `C`, 60 a `D`, and anything lower an `F`. Each cut-off is inclusive, so exactly 80 is a `B`.",
        "Write `letter`, which grades one average, then `letter_grades`, which grades every student using the rounded averages from step 1.",
      ],
      starter: `${GRADE_AVERAGES}

CUTOFFS = [(90, "A"), (80, "B"), (70, "C"), (60, "D")]


def letter(average: float) -> str:
    # The first cut-off the average reaches, otherwise an F.
    return "F"


def letter_grades(scores: list[list]) -> dict[str, str]:
    # One letter per student, from their average.
    return {}
`,
      solution: GRADE_LETTERS,
      tests: [
        ...pyCases("letter", [
          {
            id: "boundary",
            name: "A cut-off is inclusive",
            description: "Exactly 90 is an A.",
            args: [90],
            expected: "A",
          },
          { id: "just-below", name: "Just below a cut-off", args: [89.9], expected: "B" },
          { id: "middle", name: "A middling average", args: [72.5], expected: "C" },
          { id: "fail", name: "Below every cut-off", args: [59.9], expected: "F" },
        ]),
        ...pyCases("letter_grades", [
          {
            id: "term",
            name: "Every student gets a letter",
            args: [TERM],
            expected: { Maya: "A", Theo: "B", Iris: "B" },
          },
          {
            id: "empty",
            name: "No records, no grades",
            args: [[]],
            expected: {},
          },
        ]),
        {
          id: "earlier-steps",
          name: "averages still works",
          code: `got = averages([["Omar", 90], ["Omar", 85], ["Omar", 88]])
assert got == {"Omar": 87.7}, f"got {got}"`,
        },
      ],
    },
    {
      title: "Print the class report",
      short: "Report",
      solutionNote:
        "Sorting by `(-average, name)` settles the order in one pass, and the rank only changes when the average does, so a tie keeps the rank already assigned while the position keeps counting. That position is what makes the rank after a tie skip ahead; adding one per distinct average instead gives the dense ranking 1, 2, 2, 3, which is a different report.",
      signature: "def class_report(scores: list[list]) -> list[str]",
      prompt: [
        'Finish with the report a teacher prints: one line per student, such as `"1. Maya 91.0 A"`, holding the rank, the name, the average to one decimal place, and the letter.',
        "Order by average, highest first, and alphabetically by name when averages are equal. Students with the same average share a rank, and the rank after a tie skips ahead the way a race result does: two students tied for 2nd are followed by the 4th.",
        "Always show one decimal place, so an average of 91 prints as `91.0`.",
      ],
      starter: `${GRADE_LETTERS}

def class_report(scores: list[list]) -> list[str]:
    means = averages(scores)
    lines = []
    # Highest average first, ties by name; equal averages share a rank.
    return lines
`,
      solution: `${GRADE_LETTERS}

def class_report(scores: list[list]) -> list[str]:
    means = averages(scores)
    ordered = sorted(means, key=lambda student: (-means[student], student))
    lines = []
    rank = 0
    previous = None
    for position, student in enumerate(ordered, start=1):
        if means[student] != previous:
            rank = position
            previous = means[student]
        lines.append(f"{rank}. {student} {means[student]:.1f} {letter(means[student])}")
    return lines
`,
      tests: [
        ...pyCases("class_report", [
          {
            id: "term",
            name: "Highest average first",
            args: [TERM],
            expected: ["1. Maya 91.0 A", "2. Iris 88.0 B", "3. Theo 81.0 B"],
          },
          {
            id: "ties",
            name: "Ties share a rank and the next rank skips",
            description: "Three students tied for 2nd are followed by the 5th.",
            args: [
              [
                ["Bruno", 80],
                ["Alma", 80],
                ["Cyrus", 95],
                ["Dina", 70],
                ["Emeka", 80],
              ],
            ],
            expected: [
              "1. Cyrus 95.0 A",
              "2. Alma 80.0 B",
              "2. Bruno 80.0 B",
              "2. Emeka 80.0 B",
              "5. Dina 70.0 C",
            ],
          },
          {
            id: "tie-at-top",
            name: "A tie for first place",
            args: [[["Rosa", 88], ["Kofi", 88], ["Lars", 75]]],
            expected: ["1. Kofi 88.0 B", "1. Rosa 88.0 B", "3. Lars 75.0 C"],
          },
          {
            id: "fail",
            name: "A failing average",
            args: [[["Yusuf", 55], ["Yusuf", 64]]],
            expected: ["1. Yusuf 59.5 F"],
          },
          {
            id: "empty",
            name: "An empty gradebook",
            args: [[]],
            expected: [],
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert averages([["Zoe", 80], ["Zoe", 85]]) == {"Zoe": 82.5}
assert letter(80) == "B", f"got {letter(80)!r}"
assert letter_grades([["Lena", 59]]) == {"Lena": "F"}`,
        },
      ],
    },
  ],
);

// ─── Tic-Tac-Toe Referee ─────────────────────────────────────────────

const TTT_WINNER = `def lines(board: list[str]) -> list[str]:
    rows = list(board)
    columns = ["".join(row[c] for row in board) for c in range(3)]
    diagonals = [
        "".join(board[i][i] for i in range(3)),
        "".join(board[i][2 - i] for i in range(3)),
    ]
    return rows + columns + diagonals


def has_line(board: list[str], player: str) -> bool:
    return player * 3 in lines(board)


def winner(board: list[str]) -> str | None:
    for player in ("X", "O"):
        if has_line(board, player):
            return player
    return None
`;

const TTT_REACHABLE = `${TTT_WINNER}

def is_reachable(board: list[str]) -> bool:
    x = sum(row.count("X") for row in board)
    o = sum(row.count("O") for row in board)
    if x not in (o, o + 1):
        return False
    x_won = has_line(board, "X")
    o_won = has_line(board, "O")
    if x_won and o_won:
        return False
    if x_won and x != o + 1:
        return False
    if o_won and x != o:
        return False
    return True
`;

const TTT_PLACE = `def place(board: list[str], row: int, col: int, player: str) -> list[str]:
    changed = board[row][:col] + player + board[row][col + 1:]
    return board[:row] + [changed] + board[row + 1:]
`;

const TIC_TAC_TOE_REFEREE = codeSteps(
  {
    slug: "tic-tac-toe-referee",
    title: "Tic-Tac-Toe Referee",
    difficulty: "Intermediate",
    topic: "Game state",
    language: "python",
    description:
      "Referee tic-tac-toe: find the winner, reject impossible positions, then choose X's next move.",
    solutionNote:
      "Everything reduces to one question, whether a player has three in a row, asked of the real board (who won), of its history (could this board happen), and of boards one move ahead (where to play). Building the eight lines once and reusing `has_line` everywhere is what keeps the three answers consistent with each other.",
  },
  [
    {
      title: "Find the winner",
      short: "Winner",
      solutionNote:
        'Writing the eight lines out as strings turns the whole check into `"XXX" in lines(board)`: one membership test instead of eight hand-written comparisons, each a chance to get an index wrong. Asking whether a line is `player * 3`, rather than whether its three cells are equal, is also what stops a row of empty cells being declared a win.',
      signature: "def winner(board: list[str]) -> str | None",
      prompt: [
        'A board is three strings of three characters, top row first, each cell `X`, `O`, or `.` for empty: `["XO.", ".X.", "O.X"]`.',
        "Return the player with three in a row (across a row, down a column, or along either diagonal), or `None` if nobody has one. Three empty cells in a line are not a win. For this step, assume at most one player has a line.",
      ],
      starter: `def winner(board: list[str]) -> str | None:
    # Three rows, three columns and two diagonals: eight lines to check.
    return None
`,
      solution: TTT_WINNER,
      tests: pyCases("winner", [
        { id: "row", name: "A full row", args: [["XXX", "OO.", "..."]], expected: "X" },
        { id: "column", name: "A full column", args: [["OX.", "OX.", "O.X"]], expected: "O" },
        {
          id: "diagonal",
          name: "The main diagonal",
          args: [["X.O", ".XO", "..X"]],
          expected: "X",
        },
        {
          id: "anti-diagonal",
          name: "The other diagonal",
          args: [["X.O", "XO.", "O.X"]],
          expected: "O",
        },
        {
          id: "draw",
          name: "A full board with no line",
          args: [["XOX", "XOO", "OXX"]],
          expected: null,
        },
        {
          id: "empty-line",
          name: "A line of empty cells is not a win",
          description: "Checking that three cells are equal, without checking what they hold, calls the top row a win.",
          args: [["...", "XOX", "OXO"]],
          expected: null,
        },
        {
          id: "empty",
          name: "An empty board",
          args: [["...", "...", "..."]],
          expected: null,
        },
      ]),
    },
    {
      title: "Reject impossible boards",
      short: "Reachable",
      solutionNote:
        "Every rule comes from one fact: the game stops the moment a line is completed, so the owner of a line made the last move, and the counts say who that was. The both-players rule even follows from the other two, since an X line needs one more X than O and an O line needs equal counts; checking it explicitly just keeps the code reading like the rules. Counting marks alone, which is where most answers stop, accepts the board where O kept playing after X had won.",
      signature: "def is_reachable(board: list[str]) -> bool",
      prompt: [
        "Not every board could come from a real game. X always moves first and the players alternate, so X has either as many marks as O or exactly one more.",
        "Write `is_reachable`. On top of the counts, the game stops as soon as someone completes a line. So both players cannot have a line, an X win means X moved last (one more X than O), and an O win means O moved last (equal counts). X completing two lines with a single move is fine.",
      ],
      starter: `${TTT_WINNER}

def is_reachable(board: list[str]) -> bool:
    x = sum(row.count("X") for row in board)
    o = sum(row.count("O") for row in board)
    # The counts first, then who could have moved last.
    return True
`,
      solution: TTT_REACHABLE,
      tests: pyCases("is_reachable", [
        {
          id: "in-progress",
          name: "A game in progress",
          args: [["XO.", ".X.", "..."]],
          expected: true,
        },
        {
          id: "o-first",
          name: "O cannot move first",
          args: [["O..", "...", "..."]],
          expected: false,
        },
        {
          id: "x-twice",
          name: "X cannot move twice in a row",
          args: [["XX.", "...", "..."]],
          expected: false,
        },
        {
          id: "both-won",
          name: "Both players cannot have a line",
          args: [["XXX", "OOO", "..."]],
          expected: false,
        },
        {
          id: "o-after-x-won",
          name: "O cannot keep playing after X wins",
          description: "The counts are equal, so O moved last, but X already had a line.",
          args: [["XXX", "OO.", "O.."]],
          expected: false,
        },
        {
          id: "x-after-o-won",
          name: "X cannot keep playing after O wins",
          args: [["OOO", "XX.", "X.X"]],
          expected: false,
        },
        {
          id: "double-line",
          name: "One move can complete two lines",
          args: [["XXX", "XOO", "XOO"]],
          expected: true,
        },
        {
          id: "draw",
          name: "A drawn game",
          args: [["XOX", "XOO", "OXX"]],
          expected: true,
        },
      ]),
    },
    {
      title: "Choose X's move",
      short: "Move",
      solutionNote:
        "Trying a move means placing the mark on a copy and asking `has_line`, the question step 1 already answers, so the strategy needs no line logic of its own. The order of the two loops is the strategy: checking every X win before any O threat is what makes winning beat blocking, and a single scan that returns the first cell that either wins or blocks gets it wrong whenever the block comes earlier in reading order.",
      signature: "def best_move(board: list[str]) -> list[int]",
      prompt: [
        "Now play as X. Given a reachable board where it is X's turn and nobody has won yet, return the cell X should take as `[row, col]`, counting from 0. The `place` helper returns a copy of the board with one more mark on it.",
        "Use the simplest sound strategy: take a cell that wins on the spot if there is one; otherwise take a cell that stops O winning on its next move; otherwise take the first free cell. Cells are scanned in reading order (row by row, left to right), and within each rule the first cell found is the answer.",
      ],
      starter: `${TTT_REACHABLE}

${TTT_PLACE}

def best_move(board: list[str]) -> list[int]:
    free = [[r, c] for r in range(3) for c in range(3) if board[r][c] == "."]
    # Win if you can, else block, else the first free cell.
    return free[-1]
`,
      solution: `${TTT_REACHABLE}

${TTT_PLACE}

def best_move(board: list[str]) -> list[int]:
    free = [[r, c] for r in range(3) for c in range(3) if board[r][c] == "."]
    for player in ("X", "O"):
        for r, c in free:
            if has_line(place(board, r, c, player), player):
                return [r, c]
    return free[0]
`,
      tests: [
        ...pyCases("best_move", [
          {
            id: "win",
            name: "Take the win",
            description: "The first free cell is row 1, column 2; the win is at row 2, column 2.",
            args: [["XOX", "OX.", "O.."]],
            expected: [2, 2],
          },
          {
            id: "block",
            name: "Block O's line",
            args: [["XXO", ".OX", "..O"]],
            expected: [2, 0],
          },
          {
            id: "win-over-block",
            name: "Winning beats blocking",
            description: "O threatens row 1, column 2, which comes first in reading order, but X can win at row 2, column 1.",
            args: [["XXO", "OX.", "..O"]],
            expected: [2, 1],
          },
          {
            id: "two-wins",
            name: "Two ways to win: the first in reading order",
            args: [["XOX", ".XO", ".O."]],
            expected: [2, 0],
          },
          {
            id: "two-threats",
            name: "Two threats: block the first in reading order",
            args: [["XXO", ".O.", ".XO"]],
            expected: [1, 2],
          },
          {
            id: "quiet",
            name: "Nothing to win or block",
            args: [["X..", ".O.", "..."]],
            expected: [0, 1],
          },
          {
            id: "opening",
            name: "The opening move",
            args: [["...", "...", "..."]],
            expected: [0, 0],
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert winner(["X.O", "XO.", "O.X"]) == "O"
assert is_reachable(["XXX", "OO.", "O.."]) is False
assert is_reachable(["XXX", "XOO", "XOO"]) is True`,
        },
      ],
    },
  ],
);

// ─── Calendar Free Slots ─────────────────────────────────────────────

const CAL_PARSE = `def to_minutes(clock: str) -> int:
    hours, minutes = clock.strip().split(":")
    return int(hours) * 60 + int(minutes)


def parse_interval(text: str) -> list[int]:
    start, end = (to_minutes(part) for part in text.split("-"))
    if end <= start:
        raise ValueError("an interval must end after it starts: " + text)
    return [start, end]
`;

const CAL_MERGE = `${CAL_PARSE}

def busy_blocks(calendars: list[list[str]]) -> list[list[int]]:
    intervals = sorted(parse_interval(text) for calendar in calendars for text in calendar)
    merged = []
    for start, end in intervals:
        if merged and start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged
`;

/** Three people's Tuesdays, overlapping at the start of the morning. */
const TEAM: Value = [
  ["09:00-10:30", "13:00-14:00"],
  ["10:15-11:00", "15:30-16:00"],
  ["11:00-11:45"],
];

const CALENDAR_FREE_SLOTS = codeSteps(
  {
    slug: "calendar-free-slots",
    title: "Calendar Free Slots",
    difficulty: "Intermediate",
    topic: "Interval arithmetic",
    language: "python",
    description:
      "Find meeting times that suit everyone: parse the times, merge several calendars, then list the free slots.",
    solutionNote:
      "Each step turns the problem into one with less in it: text becomes minutes, several calendars become one sorted list of busy blocks, and free time is then just the gaps between consecutive blocks, clipped to the working day. Merging first is what makes the gaps honest; looking for gaps in each calendar separately finds times when one person is free and another is not.",
  },
  [
    {
      title: "Parse the times",
      short: "Parse",
      solutionNote:
        "Converting to minutes is what turns the rest of the build into arithmetic rather than string handling: once a time is an integer, comparing, subtracting and merging are operators you already have. Checking `end <= start` here, at the edge, means every later step can assume an interval has a positive length.",
      signature: "def parse_interval(text: str) -> list[int]",
      prompt: [
        'Meeting times arrive as text like `"09:00-10:30"`. Write `to_minutes`, which turns `"09:30"` into minutes after midnight (`570`), and `parse_interval`, which turns an interval into `[start, end]` in minutes.',
        'Allow spaces around the dash and single-digit hours, as in `" 9:05 - 17:45 "`. An interval that does not end after it starts raises `ValueError`, and that includes one that ends at the minute it starts.',
      ],
      starter: `def to_minutes(clock: str) -> int:
    # "09:30" is 9 hours and 30 minutes after midnight.
    return 0


def parse_interval(text: str) -> list[int]:
    # Split on the dash, convert both ends, and check their order.
    return [0, 0]
`,
      solution: CAL_PARSE,
      tests: [
        ...pyCases("to_minutes", [
          { id: "minutes", name: "Hours and minutes", args: ["09:30"], expected: 570 },
          { id: "midnight", name: "Midnight is zero", args: ["00:00"], expected: 0 },
          { id: "late", name: "The last minute of the day", args: ["23:59"], expected: 1439 },
        ]),
        ...pyCases("parse_interval", [
          {
            id: "interval",
            name: "An interval becomes two numbers",
            args: ["09:00-10:30"],
            expected: [540, 630],
          },
          {
            id: "loose",
            name: "Spaces and single-digit hours",
            args: [" 9:05 - 17:45 "],
            expected: [545, 1065],
          },
          {
            id: "backwards",
            name: "An interval that ends before it starts",
            args: ["10:00-09:00"],
            throws: { py: "ValueError" },
          },
          {
            id: "zero-length",
            name: "An interval with no length",
            args: ["12:00-12:00"],
            throws: { py: "ValueError" },
          },
        ]),
      ],
    },
    {
      title: "Merge everyone's calendars",
      short: "Merge",
      solutionNote:
        "Sorting by start is what lets a single pass merge everything: once intervals arrive in order, each one either overlaps the last block or starts a new one, and nothing earlier ever needs revisiting. Extending with `max` rather than just taking the new end is what stops a short meeting nested inside a long one from cutting the block short.",
      signature: "def busy_blocks(calendars: list[list[str]]) -> list[list[int]]",
      prompt: [
        "To find a time that suits everyone, first combine everyone's calendars. `calendars` is a list of calendars, each a list of interval strings. Return the busy blocks as `[start, end]` minute pairs, sorted by start, with overlapping intervals merged into one.",
        "Touching intervals merge too: if one person is busy until 10:00 and another from 10:00, there is no gap between them. Merge across calendars, not just within one. A person's intervals are not necessarily in order, and a short meeting can sit entirely inside a longer one.",
      ],
      starter: `${CAL_PARSE}

def busy_blocks(calendars: list[list[str]]) -> list[list[int]]:
    merged = []
    # Every interval from every calendar, in start order, merged.
    return merged
`,
      solution: CAL_MERGE,
      tests: [
        ...pyCases("busy_blocks", [
          {
            id: "team",
            name: "Overlaps across calendars merge",
            description: "10:15-11:00 overlaps the first meeting and 11:00-11:45 touches it.",
            args: [TEAM],
            expected: [
              [540, 705],
              [780, 840],
              [930, 960],
            ],
          },
          {
            id: "touching",
            name: "Touching intervals merge",
            args: [[["09:00-10:00"], ["10:00-11:00"]]],
            expected: [[540, 660]],
          },
          {
            id: "nested",
            name: "A meeting inside a longer one",
            description: "Taking the later interval's end would shrink the block to 10:30.",
            args: [[["09:00-12:00", "10:00-10:30"]]],
            expected: [[540, 720]],
          },
          {
            id: "unordered",
            name: "Intervals out of order",
            args: [[["14:00-15:00", "08:00-08:30"]]],
            expected: [
              [480, 510],
              [840, 900],
            ],
          },
          {
            id: "apart",
            name: "Separate meetings stay separate",
            args: [[["09:00-09:30"], ["09:45-10:00"]]],
            expected: [
              [540, 570],
              [585, 600],
            ],
          },
          {
            id: "empty",
            name: "Nobody is busy",
            args: [[[], []]],
            expected: [],
          },
        ]),
        {
          id: "earlier-steps",
          name: "parse_interval still works",
          code: `got = parse_interval("09:00-10:30")
assert got == [540, 630], f"got {got}"`,
        },
      ],
    },
    {
      title: "Find the free slots",
      short: "Free",
      solutionNote:
        "A cursor that only moves forward, `max(cursor, end)`, does all the clipping at the start of the day: a block that began before it just pushes the cursor to where it ends. Capping each gap at `day_end` handles the other edge, and the zero-length block appended at `day_end` turns the time after the last meeting into an ordinary gap, so nothing needs handling after the loop.",
      signature:
        "def free_slots(calendars: list[list[str]], hours: str, min_minutes: int) -> list[str]",
      prompt: [
        'Now the answer people want: the free slots inside the working hours `hours` (such as `"09:00-17:00"`) that are at least `min_minutes` long. Return them as `"HH:MM-HH:MM"` strings in time order, with two-digit hours and minutes; `to_clock` turns minutes back into `"HH:MM"`.',
        "Busy time outside working hours does not matter: a meeting from 08:30 to 09:30 means the first free minute is 09:30, and one that starts at 16:30 and runs late ends the last slot at 16:30. A slot exactly `min_minutes` long counts. `min_minutes` is at least 1.",
      ],
      starter: `${CAL_MERGE}

def to_clock(minutes: int) -> str:
    # 570 is "09:30".
    return ""


def free_slots(calendars: list[list[str]], hours: str, min_minutes: int) -> list[str]:
    day_start, day_end = parse_interval(hours)
    slots = []
    # Walk the busy blocks with a cursor that starts at day_start.
    return slots
`,
      solution: `${CAL_MERGE}

def to_clock(minutes: int) -> str:
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


def free_slots(calendars: list[list[str]], hours: str, min_minutes: int) -> list[str]:
    day_start, day_end = parse_interval(hours)
    slots = []
    cursor = day_start
    for start, end in busy_blocks(calendars) + [[day_end, day_end]]:
        gap_end = min(start, day_end)
        if gap_end - cursor >= min_minutes:
            slots.append(to_clock(cursor) + "-" + to_clock(gap_end))
        cursor = max(cursor, end)
    return slots
`,
      tests: [
        ...pyCases("to_clock", [
          { id: "clock", name: "Minutes back to a clock time", args: [545], expected: "09:05" },
        ]),
        ...pyCases("free_slots", [
          {
            id: "team",
            name: "The gaps between everyone's meetings",
            args: [TEAM, "09:00-17:00", 30],
            expected: ["11:45-13:00", "14:00-15:30", "16:00-17:00"],
          },
          {
            id: "exact",
            name: "A gap of exactly min_minutes counts",
            args: [[["09:00-10:00", "10:30-11:00"]], "09:00-12:00", 30],
            expected: ["10:00-10:30", "11:00-12:00"],
          },
          {
            id: "too-short",
            name: "A shorter gap does not",
            args: [[["09:00-10:00", "10:30-11:00"]], "09:00-12:00", 31],
            expected: ["11:00-12:00"],
          },
          {
            id: "edges",
            name: "Meetings that cross the edges of the day",
            args: [[["08:30-09:30", "16:30-17:30"]], "09:00-17:00", 30],
            expected: ["09:30-16:30"],
          },
          {
            id: "outside",
            name: "Meetings entirely outside working hours",
            args: [[["07:00-08:00", "18:00-19:00"]], "09:00-17:00", 30],
            expected: ["09:00-17:00"],
          },
          {
            id: "booked",
            name: "A fully booked day",
            args: [[["08:00-12:00"], ["11:00-18:00"]], "09:00-17:00", 5],
            expected: [],
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert to_minutes("09:30") == 570
assert busy_blocks([["09:00-12:00", "10:00-10:30"]]) == [[540, 720]]`,
        },
      ],
    },
  ],
);

// ─── Spell Checker ───────────────────────────────────────────────────

const SPELL_EDITS = `import string

LETTERS = string.ascii_lowercase


def edits1(word: str) -> list[str]:
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    deletes = [left + right[1:] for left, right in splits if right]
    swaps = [left + right[1] + right[0] + right[2:] for left, right in splits if len(right) > 1]
    replaces = [left + c + right[1:] for left, right in splits if right for c in LETTERS]
    inserts = [left + c + right for left, right in splits for c in LETTERS]
    candidates = set(deletes + swaps + replaces + inserts)
    candidates.discard(word)
    return sorted(candidates)
`;

const SPELL_CORRECT = `${SPELL_EDITS}

def correct(word: str, counts: dict[str, int]) -> str:
    if word in counts:
        return word
    known = [candidate for candidate in edits1(word) if candidate in counts]
    if not known:
        return word
    return min(known, key=lambda candidate: (-counts[candidate], candidate))
`;

/** Word frequencies from a (small, invented) body of text. */
const WORD_COUNTS: Value = {
  the: 500,
  a: 300,
  is: 200,
  an: 150,
  on: 150,
  from: 90,
  end: 70,
  then: 60,
  than: 55,
  cat: 40,
  car: 30,
  sat: 25,
  hello: 20,
  room: 20,
  world: 18,
  form: 15,
  cart: 12,
  check: 8,
  spelling: 5,
  checker: 3,
};

const SPELL_CHECKER = codeSteps(
  {
    slug: "spell-checker",
    title: "Spell Checker",
    difficulty: "Advanced",
    topic: "Candidate generation",
    language: "python",
    description:
      "Suggest corrections the way a simple spell checker does: generate one-edit candidates, rank them by frequency, then fix a sentence.",
    solutionNote:
      "The whole checker rests on turning \"which known word is closest?\" around into \"which of these few hundred strings is known?\". The candidate set depends only on the length of the word, so each correction costs the same whether the vocabulary holds a thousand words or a million, and ranking the known candidates by frequency is what picks `the` over `then` for `thn`.",
  },
  [
    {
      title: "Generate one-edit candidates",
      short: "Edits",
      solutionNote:
        "Splitting the word at every position once and deriving all four edits from the same `(left, right)` pairs keeps the edge cases out of the index arithmetic: a delete needs a non-empty `right`, a swap needs two letters in it, and an insert works at every split, both ends included. A set then absorbs the duplicates that repeated letters produce.",
      signature: "def edits1(word: str) -> list[str]",
      prompt: [
        "Most typing mistakes are one edit away from the intended word. Write `edits1`, which returns every string one edit away from `word`, using four kinds of edit: delete one letter, swap two adjacent letters, replace one letter with any of `a` to `z`, or insert any of `a` to `z` at any position, both ends included.",
        "Return them sorted, with no duplicates, and without `word` itself (replacing a letter with itself, or swapping two equal letters, gets you back where you started). Words are lowercase ASCII, and deleting the only letter of a one-letter word leaves the empty string, which counts.",
        "Splitting the word at every position, `(word[:i], word[i:])`, gives each kind of edit a one-line comprehension.",
      ],
      starter: `import string

LETTERS = string.ascii_lowercase


def edits1(word: str) -> list[str]:
    splits = [(word[:i], word[i:]) for i in range(len(word) + 1)]
    # Deletes, adjacent swaps, replacements and inserts, from the splits.
    return []
`,
      solution: SPELL_EDITS,
      tests: [
        {
          id: "kinds",
          name: "Every kind of edit is there",
          code: `got = edits1("cat")
for want in ["at", "ct", "ca", "act", "cta", "bat", "cot", "car", "scat", "cart", "cats"]:
    assert want in got, f"{want!r} is one edit from 'cat' but is missing"`,
        },
        {
          id: "nothing-further",
          name: "Nothing more than one edit away",
          code: `got = edits1("cat")
for unwanted in ["cat", "tac", "c", "caats", "dog"]:
    assert unwanted not in got, f"{unwanted!r} should not be in the result"`,
        },
        {
          id: "count",
          name: "The right number of candidates",
          description: "3 deletes, 2 swaps, 75 replacements and 101 distinct inserts.",
          code: `got = edits1("cat")
assert len(got) == 181, f"got {len(got)} candidates"`,
        },
        {
          id: "repeated-letters",
          name: "Repeated letters give fewer distinct candidates",
          description: "Swapping the two o's gives back book itself.",
          code: `got = edits1("book")
assert got == sorted(set(got)), "the result should be sorted, with no duplicates"
assert "book" not in got, "the word itself should not be a candidate"
assert len(got) == 231, f"got {len(got)} candidates"`,
        },
        {
          id: "one-letter",
          name: "A one-letter word",
          code: `got = edits1("a")
assert "" in got, "deleting the only letter leaves the empty string"
assert len(got) == 77, f"got {len(got)} candidates"`,
        },
        ...pyCases("edits1", [
          {
            id: "empty",
            name: "The empty word",
            description: "Only the 26 one-letter inserts.",
            args: [""],
            expected: [..."abcdefghijklmnopqrstuvwxyz"],
          },
        ]),
      ],
    },
    {
      title: "Pick the best correction",
      short: "Correct",
      solutionNote:
        "Generating the few hundred strings one edit away and looking each one up costs about 54 dictionary lookups per letter, whatever the size of the vocabulary, while comparing the misspelling with every known word costs a full pass over the vocabulary for each word checked. Asking `word in counts` first is what keeps a real but rarer word from being \"corrected\" into a more common one.",
      signature: "def correct(word: str, counts: dict[str, int]) -> str",
      prompt: [
        "Now choose a correction. `counts` maps each known word to how often it appears in a large body of text. If `word` is known, it is already right: return it, even when a neighbour is more common (`form` is a word, even though `from` is more frequent).",
        "Otherwise, of the candidates from `edits1` that are known, return the most frequent, breaking ties alphabetically. If none is known, return `word` unchanged.",
        "Generate the candidates from the word and look each one up. Scanning the whole vocabulary for words that are close is far too slow once it holds a hundred thousand entries, and one of the checks does.",
      ],
      starter: `${SPELL_EDITS}

def correct(word: str, counts: dict[str, int]) -> str:
    # A known word stands; otherwise the most frequent known neighbour.
    return word
`,
      solution: SPELL_CORRECT,
      tests: [
        ...pyCases("correct", [
          {
            id: "swap",
            name: "A swapped pair of letters",
            args: ["teh", WORD_COUNTS],
            expected: "the",
          },
          {
            id: "frequency",
            name: "The most frequent neighbour wins",
            description: "the, then and than are all one edit from thn.",
            args: ["thn", WORD_COUNTS],
            expected: "the",
          },
          {
            id: "known",
            name: "A known word is left alone",
            description: "from is more common, but form is a word.",
            args: ["form", WORD_COUNTS],
            expected: "form",
          },
          {
            id: "missing-letter",
            name: "A missing letter",
            args: ["speling", WORD_COUNTS],
            expected: "spelling",
          },
          {
            id: "ties",
            name: "Equal counts go to the alphabetically first word",
            args: ["at", { hat: 4, cat: 10, bat: 10 }],
            expected: "bat",
          },
          {
            id: "hopeless",
            name: "Nothing known nearby",
            args: ["zzxq", WORD_COUNTS],
            expected: "zzxq",
          },
        ]),
        {
          id: "large",
          name: "A hundred thousand known words",
          description: "Comparing every known word with each misspelling is too slow here.",
          code: `import itertools
counts = {"".join(p): i for i, p in enumerate(itertools.product("abcdefghij", repeat=5))}
prefixes = itertools.islice(itertools.product("abcdefghij", repeat=4), 0, 10000, 5)
words = ["".join(p) + "z" for p in prefixes]
got = [correct(word, counts) for word in words]
want = [word[:4] + "j" for word in words]
wrong = [(w, g) for w, g, x in zip(words, got, want) if g != x]
assert not wrong, f"{len(wrong)} wrong corrections, for example {wrong[:3]}"`,
        },
        {
          id: "earlier-steps",
          name: "edits1 still works",
          code: `assert len(edits1("cat")) == 181, f"got {len(edits1('cat'))} candidates"`,
        },
      ],
    },
    {
      title: "Correct a sentence",
      short: "Sentence",
      solutionNote:
        "`re.sub` with a function is a tokenizer and a reassembler in one: it hands you each word and stitches your replacement back between the untouched punctuation, so nothing between the words can be lost or doubled. Comparing the correction with the lowercased original before touching case is what lets `NASA` through unchanged, instead of being rewritten as `Nasa` by a rule meant only for words that were actually wrong.",
      signature: "def correct_text(text: str, counts: dict[str, int]) -> str",
      prompt: [
        "Correct a whole sentence. A word is a run of ASCII letters; everything else (spaces, punctuation, digits) is copied through untouched. Look each word up in lowercase with `correct`.",
        "A word that needs no change is copied exactly as written, whatever its case, so `NASA` stays `NASA` and `The` stays `The`. A word that is corrected comes out in lowercase, except that its first letter is a capital when the original's was: `Teh` becomes `The`, and `HELO` becomes `Hello`.",
        "`re.sub` with a function as the replacement does the splitting and the reassembly for you.",
      ],
      starter: `import re
${SPELL_CORRECT}

def correct_text(text: str, counts: dict[str, int]) -> str:
    # Fix each run of letters; leave everything between them alone.
    return text
`,
      solution: `import re
${SPELL_CORRECT}

def correct_text(text: str, counts: dict[str, int]) -> str:
    def fix(match: re.Match) -> str:
        original = match.group(0)
        fixed = correct(original.lower(), counts)
        if fixed == original.lower():
            return original
        if original[0].isupper():
            return fixed[0].upper() + fixed[1:]
        return fixed

    return re.sub("[A-Za-z]+", fix, text)
`,
      tests: [
        ...pyCases("correct_text", [
          {
            id: "sentence",
            name: "Capitals and punctuation survive",
            args: ["Teh cat sat, helo wrld!", WORD_COUNTS],
            expected: "The cat sat, hello world!",
          },
          {
            id: "unchanged-case",
            name: "A word that needs no change keeps its case",
            description: "NASA is unknown with no known neighbour, and The is known.",
            args: ["NASA is a Speling chekcer. The end.", WORD_COUNTS],
            expected: "NASA is a Spelling checker. The end.",
          },
          {
            id: "shouted",
            name: "A corrected word is lowercase after its first letter",
            args: ["HELO WRLD", WORD_COUNTS],
            expected: "Hello World",
          },
          {
            id: "digits",
            name: "Digits and symbols pass through",
            args: ["Room 42: teh end.", WORD_COUNTS],
            expected: "Room 42: the end.",
          },
          {
            id: "empty",
            name: "An empty string",
            args: ["", WORD_COUNTS],
            expected: "",
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert correct("form", {"form": 1, "from": 9}) == "form"
assert correct("thn", {"the": 5, "then": 3}) == "the"
assert "" in edits1("a")`,
        },
      ],
    },
  ],
);

// ─── Sudoku Validator ────────────────────────────────────────────────

/** A sudoku grid from nine rows of digits, with 0 for an empty cell. */
function grid(...rows: string[]): number[][] {
  return rows.map((row) => [...row].map(Number));
}

/** A copy of `base` with some cells overwritten, as `[row, col, digit]`. */
function withCells(base: number[][], cells: [number, number, number][]): number[][] {
  const copy = base.map((row) => [...row]);
  for (const [r, c, digit] of cells) copy[r][c] = digit;
  return copy;
}

/** A grid argument, shown as `f(…)` in a failure message rather than 81 digits. */
function gridArgs(...args: Value[]): string {
  return args.map(pyLiteral).join(", ");
}

/** An easy puzzle: naked singles alone solve it, over several rounds. */
const PUZZLE = grid(
  "260893000",
  "105000600",
  "008000000",
  "070080090",
  "350604078",
  "020010050",
  "000000400",
  "006000803",
  "000176025",
);

const SOLVED = grid(
  "267893541",
  "135247689",
  "948561732",
  "671385294",
  "359624178",
  "824719356",
  "512938467",
  "796452813",
  "483176925",
);

/** The same puzzle with six more clues removed: singles get stuck part way. */
const TOUGH = grid(
  "000893000",
  "100000600",
  "008000000",
  "070080090",
  "350604070",
  "020010000",
  "000000400",
  "006000803",
  "000170025",
);

/** Where naked singles leave TOUGH: 29 cells filled, 28 still open. */
const TOUGH_AFTER = grid(
  "000893000",
  "100007600",
  "008001000",
  "671385294",
  "359624178",
  "824719006",
  "010008467",
  "096002813",
  "483176925",
);

const EMPTY_GRID = grid(...Array<string>(9).fill("000000000"));

/** A 6 added to the top row, which already has one. */
const ROW_CLASH = withCells(PUZZLE, [[0, 8, 6]]);
/** A 4 at the top of column 6, which already has one lower down; its row and box do not. */
const COLUMN_CLASH = withCells(PUZZLE, [[0, 6, 4]]);
/** A 1 in the top-left box, which already has one; its row and column do not. */
const BOX_CLASH = withCells(PUZZLE, [[0, 2, 1]]);

const SUDOKU_ROWS = `def unit_valid(cells: list[int]) -> bool:
    digits = [cell for cell in cells if cell != 0]
    return len(digits) == len(set(digits))


def rows_valid(grid: list[list[int]]) -> bool:
    return all(unit_valid(row) for row in grid)
`;

const SUDOKU_VALID = `${SUDOKU_ROWS}

def columns(grid: list[list[int]]) -> list[list[int]]:
    return [[grid[r][c] for r in range(9)] for c in range(9)]


def boxes(grid: list[list[int]]) -> list[list[int]]:
    return [
        [grid[r][c] for r in range(top, top + 3) for c in range(left, left + 3)]
        for top in range(0, 9, 3)
        for left in range(0, 9, 3)
    ]


def is_valid(grid: list[list[int]]) -> bool:
    return all(unit_valid(unit) for unit in grid + columns(grid) + boxes(grid))
`;

const SUDOKU_VALIDATOR = codeSteps(
  {
    slug: "sudoku-validator",
    title: "Sudoku Validator",
    difficulty: "Intermediate",
    topic: "Constraint checking",
    language: "python",
    description:
      "Check a sudoku grid row by row, then by column and box, then fill in every cell that has only one possible digit.",
    solutionNote:
      "A row, a column and a box are the same thing to the rules, a group of nine cells, so the whole validator is one check applied to 27 groups. Candidates are that idea turned around: instead of asking whether the digits in a group clash, ask which digits a cell's three groups leave free, and a cell with only one answer is a move you can make.",
  },
  [
    {
      title: "Check the rows",
      short: "Rows",
      solutionNote:
        "Comparing the number of digits with the size of their set is a duplicate check in one line, and filtering out the zeros first is what stops a half-empty row from looking like it repeats `0`. Writing it for one group of cells rather than for rows is the point: columns and boxes are about to need exactly the same check.",
      signature: "def rows_valid(grid: list[list[int]]) -> bool",
      prompt: [
        "A sudoku grid is a list of 9 rows of 9 integers, with `0` for an empty cell. Start with the rule every row, column and box shares: no digit from 1 to 9 appears twice. Empty cells can repeat as often as they like.",
        "Write `unit_valid`, which checks one group of 9 cells, then `rows_valid`, which applies it to every row of the grid.",
      ],
      starter: `def unit_valid(cells: list[int]) -> bool:
    # Ignore the zeros; no digit may appear twice.
    return True


def rows_valid(grid: list[list[int]]) -> bool:
    # Every row must pass unit_valid.
    return True
`,
      solution: SUDOKU_ROWS,
      tests: [
        ...pyCases("unit_valid", [
          {
            id: "zeros",
            name: "Empty cells may repeat",
            args: [[5, 3, 0, 0, 7, 0, 0, 0, 0]],
            expected: true,
          },
          {
            id: "repeat",
            name: "A repeated digit",
            args: [[5, 3, 0, 0, 7, 0, 0, 3, 0]],
            expected: false,
          },
          {
            id: "full",
            name: "All nine digits",
            args: [[9, 1, 8, 2, 7, 3, 6, 4, 5]],
            expected: true,
          },
        ]),
        ...pyCases("rows_valid", [
          {
            id: "puzzle",
            name: "A puzzle with no repeats in any row",
            pyArgs: gridArgs(PUZZLE),
            expected: true,
          },
          {
            id: "row-clash",
            name: "One row repeats a digit",
            pyArgs: gridArgs(ROW_CLASH),
            expected: false,
          },
          {
            id: "empty-grid",
            name: "An empty grid",
            pyArgs: gridArgs(EMPTY_GRID),
            expected: true,
          },
        ]),
      ],
    },
    {
      title: "Add columns and boxes",
      short: "Valid",
      solutionNote:
        "Once rows, columns and boxes are all lists of nine cells, validity is a single `all(...)` over 27 groups with the same `unit_valid`, and there is no separate column rule or box rule to drift apart. The box comprehension is the only real index work: stepping `top` and `left` by 3 visits the nine blocks, and the inner ranges read each block row by row.",
      signature: "def is_valid(grid: list[list[int]]) -> bool",
      prompt: [
        "A valid grid also has no repeated digit in any column, or in any of the nine 3×3 boxes. Write `columns` and `boxes`, which return those groups as lists of nine cells; `is_valid` then checks all 27 groups with `unit_valid`.",
        "Column `c` is `grid[r][c]` for every row `r`, top to bottom. Boxes run left to right, then top to bottom, and each is read row by row: the box whose top-left cell is at `top`, `left` (each 0, 3 or 6) holds `grid[r][c]` for `r` in `range(top, top + 3)` and `c` in `range(left, left + 3)`.",
      ],
      starter: `${SUDOKU_ROWS}

def columns(grid: list[list[int]]) -> list[list[int]]:
    # Column c is grid[r][c] for every row r.
    return []


def boxes(grid: list[list[int]]) -> list[list[int]]:
    # Nine boxes, each the nine cells of a 3 by 3 block, read row by row.
    return []


def is_valid(grid: list[list[int]]) -> bool:
    return all(unit_valid(unit) for unit in grid + columns(grid) + boxes(grid))
`,
      solution: SUDOKU_VALID,
      tests: [
        {
          id: "columns",
          name: "Columns read top to bottom",
          code: `numbered = [[r * 9 + c for c in range(9)] for r in range(9)]
got = columns(numbered)
assert len(got) == 9, f"expected 9 columns, got {len(got)}"
assert got[2] == [2, 11, 20, 29, 38, 47, 56, 65, 74], f"column 2 is {got[2]}"`,
        },
        {
          id: "boxes",
          name: "Boxes run across, then down, and read row by row",
          code: `numbered = [[r * 9 + c for c in range(9)] for r in range(9)]
got = boxes(numbered)
assert len(got) == 9, f"expected 9 boxes, got {len(got)}"
assert got[1] == [3, 4, 5, 12, 13, 14, 21, 22, 23], f"box 1 is {got[1]}"
assert got[5] == [33, 34, 35, 42, 43, 44, 51, 52, 53], f"box 5 is {got[5]}"`,
        },
        ...pyCases("is_valid", [
          {
            id: "puzzle",
            name: "A puzzle with no clashes",
            pyArgs: gridArgs(PUZZLE),
            expected: true,
          },
          {
            id: "solved",
            name: "A completed grid",
            pyArgs: gridArgs(SOLVED),
            expected: true,
          },
          {
            id: "column-clash",
            name: "A repeated digit in a column",
            description: "Every row is fine.",
            pyArgs: gridArgs(COLUMN_CLASH),
            expected: false,
          },
          {
            id: "box-clash",
            name: "A repeated digit in a box",
            description: "Every row and every column is fine.",
            pyArgs: gridArgs(BOX_CLASH),
            expected: false,
          },
          {
            id: "empty-grid",
            name: "An empty grid",
            pyArgs: gridArgs(EMPTY_GRID),
            expected: true,
          },
        ]),
        ...pyCases("rows_valid", [
          {
            id: "earlier-steps",
            name: "rows_valid still works",
            pyArgs: gridArgs(ROW_CLASH),
            expected: false,
          },
        ]),
      ],
    },
    {
      title: "Fill in the forced cells",
      short: "Singles",
      solutionNote:
        "Filling in place and looping until a pass changes nothing is what lets one deduction feed the next: each digit placed removes a candidate from up to twenty other cells, and some of those drop to one. Copying the grid with `[row[:] for row in grid]` rather than `grid[:]`, which would share the rows, is what leaves the caller's puzzle intact.",
      signature: "def fill_singles(grid: list[list[int]]) -> list[list[int]]",
      prompt: [
        "Now start solving. `candidates` returns, in increasing order, the digits that could go in an empty cell: those not already in its row, its column or its box. A cell that already holds a digit has no candidates, so return `[]` for it.",
        "Then write `fill_singles`. Fill in every empty cell that has exactly one candidate, and keep going until a whole pass fills nothing, because each digit placed can leave another cell with only one option. Return the new grid without changing the one you were given. On an easy puzzle this solves it completely; on a harder one it stops with some cells still `0`.",
      ],
      starter: `${SUDOKU_VALID}

def candidates(grid: list[list[int]], row: int, col: int) -> list[int]:
    if grid[row][col] != 0:
        return []
    # The digits not in this row, this column or this box.
    return []


def fill_singles(grid: list[list[int]]) -> list[list[int]]:
    grid = [row[:] for row in grid]
    # Fill the cells with one candidate, until a pass changes nothing.
    return grid
`,
      solution: `${SUDOKU_VALID}

def candidates(grid: list[list[int]], row: int, col: int) -> list[int]:
    if grid[row][col] != 0:
        return []
    top, left = row - row % 3, col - col % 3
    used = set(grid[row])
    used |= {grid[r][col] for r in range(9)}
    used |= {grid[r][c] for r in range(top, top + 3) for c in range(left, left + 3)}
    return [digit for digit in range(1, 10) if digit not in used]


def fill_singles(grid: list[list[int]]) -> list[list[int]]:
    grid = [row[:] for row in grid]
    changed = True
    while changed:
        changed = False
        for r in range(9):
            for c in range(9):
                options = candidates(grid, r, c)
                if len(options) == 1:
                    grid[r][c] = options[0]
                    changed = True
    return grid
`,
      tests: [
        ...pyCases("candidates", [
          {
            id: "two-options",
            name: "An empty cell with two candidates",
            pyArgs: gridArgs(PUZZLE, 0, 2),
            expected: [4, 7],
          },
          {
            id: "filled",
            name: "A filled cell has none",
            pyArgs: gridArgs(PUZZLE, 0, 0),
            expected: [],
          },
          {
            id: "open",
            name: "Every digit fits an empty grid",
            pyArgs: gridArgs(EMPTY_GRID, 4, 4),
            expected: [1, 2, 3, 4, 5, 6, 7, 8, 9],
          },
        ]),
        ...pyCases("fill_singles", [
          {
            id: "solves",
            name: "An easy puzzle is solved completely",
            description: "One pass over the grid is not enough; each digit placed opens up more.",
            pyArgs: gridArgs(PUZZLE),
            pyExpected: pyLiteral(SOLVED),
          },
          {
            id: "stuck",
            name: "A harder puzzle stops part way",
            pyArgs: gridArgs(TOUGH),
            pyExpected: pyLiteral(TOUGH_AFTER),
          },
          {
            id: "empty-grid",
            name: "An empty grid has no forced cells",
            pyArgs: gridArgs(EMPTY_GRID),
            pyExpected: pyLiteral(EMPTY_GRID),
          },
          {
            id: "no-mutation",
            name: "The original grid is left alone",
            pyArgs: gridArgs(PUZZLE),
            pyExpected: pyLiteral(SOLVED),
            noMutation: true,
          },
        ]),
        {
          id: "earlier-steps",
          name: "The earlier stages still work",
          code: `assert unit_valid([1, 0, 0, 1]) is False
assert len(boxes([[r * 9 + c for c in range(9)] for r in range(9)])) == 9`,
        },
      ],
    },
  ],
);

// ─── Unit Converter ──────────────────────────────────────────────────

const UNITS_LENGTH = `METRES = {
    "mm": 0.001,
    "cm": 0.01,
    "m": 1.0,
    "km": 1000.0,
    "in": 0.0254,
    "ft": 0.3048,
    "yd": 0.9144,
    "mi": 1609.344,
}


def convert_length(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit not in METRES or to_unit not in METRES:
        raise ValueError("unknown length unit: " + from_unit + " or " + to_unit)
    return value * METRES[from_unit] / METRES[to_unit]
`;

const UNITS_TEMPERATURE = `${UNITS_LENGTH}

TO_KELVIN = {"K": (0.0, 1.0), "C": (273.15, 1.0), "F": (459.67, 5 / 9)}


def convert(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit in METRES and to_unit in METRES:
        return convert_length(value, from_unit, to_unit)
    if from_unit in TO_KELVIN and to_unit in TO_KELVIN:
        shift, scale = TO_KELVIN[from_unit]
        kelvin = (value + shift) * scale
        shift, scale = TO_KELVIN[to_unit]
        return kelvin / scale - shift
    raise ValueError("cannot convert " + from_unit + " to " + to_unit)
`;

/** Unit conversions are floats; a billionth absorbs the representation noise. */
const NEAR = 1e-9;

const UNIT_CONVERTER = codeSteps(
  {
    slug: "unit-converter",
    title: "Unit Converter",
    difficulty: "Beginner",
    topic: "Lookup tables",
    language: "python",
    description:
      "Convert lengths through a table, add temperatures, which need an offset as well, then answer typed queries like 5 ft in m.",
    solutionNote:
      "Both kinds of unit are lookup tables into a common base, metres or kelvin, and the only difference is what each table stores: a length needs a factor, a temperature a shift and a factor, because the scales do not share a zero. The query parser at the end knows nothing about units at all; it reads four words and hands the rest to `convert`.",
  },
  [
    {
      title: "Convert lengths",
      short: "Lengths",
      solutionNote:
        "Going through a base unit turns 64 conversion factors into 8 table entries, and adding a unit becomes one line instead of a new row and column. The direction is the only thing to get right: the value times its unit's size is a length in metres, and dividing by the target's size says how many target units fit in it.",
      signature: "def convert_length(value: float, from_unit: str, to_unit: str) -> float",
      prompt: [
        "Convert lengths between `mm`, `cm`, `m`, `km`, `in`, `ft`, `yd` and `mi`. Rather than a factor for every pair of units, keep one table of how many metres each unit is, `METRES`, and go through metres: multiply by the size of the unit you have, then divide by the size of the unit you want.",
        "An unknown unit raises `ValueError`. Results are floats and are compared to within a billionth, so representation noise such as `2.0000000000000004` does not matter.",
      ],
      starter: `METRES = {
    "mm": 0.001,
    "cm": 0.01,
    "m": 1.0,
    "km": 1000.0,
    "in": 0.0254,
    "ft": 0.3048,
    "yd": 0.9144,
    "mi": 1609.344,
}


def convert_length(value: float, from_unit: str, to_unit: str) -> float:
    # Into metres, then out of metres.
    return value
`,
      solution: UNITS_LENGTH,
      tests: pyCases("convert_length", [
        { id: "ft-m", name: "Feet to metres", args: [5, "ft", "m"], expected: 1.524, tolerance: NEAR },
        {
          id: "mi-km",
          name: "Miles to kilometres",
          args: [1, "mi", "km"],
          expected: 1.609344,
          tolerance: NEAR,
        },
        {
          id: "m-km",
          name: "Metres to kilometres",
          description: "Multiplying by the target's size instead of dividing gives 2500000.",
          args: [2500, "m", "km"],
          expected: 2.5,
          tolerance: NEAR,
        },
        {
          id: "ft-yd",
          name: "Between two units that are not metric",
          args: [6, "ft", "yd"],
          expected: 2,
          tolerance: NEAR,
        },
        {
          id: "same",
          name: "The same unit on both sides",
          args: [7.5, "cm", "cm"],
          expected: 7.5,
          tolerance: NEAR,
        },
        {
          id: "unknown",
          name: "An unknown unit raises ValueError",
          args: [3, "ft", "furlong"],
          throws: { py: "ValueError" },
        },
      ]),
    },
    {
      title: "Add temperatures",
      short: "Temperature",
      solutionNote:
        "A temperature conversion is affine, a shift as well as a scale, which is why a table of ratios cannot hold it and would turn `0 C` into `0 F`. Storing a `(shift, scale)` pair per unit keeps the lookup-table design: go through kelvin the way lengths go through metres, and undo the target's pair on the way out with `kelvin / scale - shift`.",
      signature: "def convert(value: float, from_unit: str, to_unit: str) -> float",
      prompt: [
        "Add temperatures in `C`, `F` and `K` behind one function, `convert`, that handles both kinds of unit. Temperature scales do not share a zero, so a single ratio cannot convert them: 0 °C is 32 °F, not 0 °F.",
        "Each scale is a shift and then a scale away from kelvin, `kelvin = (value + shift) * scale`: Celsius shifts by 273.15, and Fahrenheit shifts by 459.67 and scales by 5/9. Those pairs are in `TO_KELVIN`; go through kelvin the way lengths go through metres.",
        "Converting between a length and a temperature, or to or from an unknown unit, raises `ValueError`.",
      ],
      starter: `${UNITS_LENGTH}

TO_KELVIN = {"K": (0.0, 1.0), "C": (273.15, 1.0), "F": (459.67, 5 / 9)}


def convert(value: float, from_unit: str, to_unit: str) -> float:
    if from_unit in METRES and to_unit in METRES:
        return convert_length(value, from_unit, to_unit)
    # Temperatures: shift and scale into kelvin, then back out.
    raise ValueError("cannot convert " + from_unit + " to " + to_unit)
`,
      solution: UNITS_TEMPERATURE,
      tests: pyCases("convert", [
        {
          id: "freezing",
          name: "Water freezes at 32 °F",
          description: "A plain ratio between the scales would say 0.",
          args: [0, "C", "F"],
          expected: 32,
          tolerance: NEAR,
        },
        { id: "boiling", name: "Water boils at 212 °F", args: [100, "C", "F"], expected: 212, tolerance: NEAR },
        { id: "body", name: "Fahrenheit to Celsius", args: [98.6, "F", "C"], expected: 37, tolerance: NEAR },
        {
          id: "absolute-zero",
          name: "Kelvin to Celsius",
          args: [0, "K", "C"],
          expected: -273.15,
          tolerance: NEAR,
        },
        {
          id: "crossover",
          name: "The one temperature both scales agree on",
          args: [-40, "C", "F"],
          expected: -40,
          tolerance: NEAR,
        },
        {
          id: "k-to-f",
          name: "Kelvin to Fahrenheit",
          args: [300, "K", "F"],
          expected: 80.33,
          tolerance: NEAR,
        },
        {
          id: "mixed",
          name: "A length is not a temperature",
          args: [5, "ft", "C"],
          throws: { py: "ValueError" },
        },
        {
          id: "lengths",
          name: "Lengths still convert",
          args: [1, "mi", "ft"],
          expected: 5280,
          tolerance: NEAR,
        },
      ]),
    },
    {
      title: "Answer typed queries",
      short: "Queries",
      solutionNote:
        "Splitting into words and reading them by position is what lets `12 in in cm` work: the parser never has to decide which `in` is which, because the unit is always the second word and the connector the third. Echoing the number as the user typed it, rather than `float(number)`, is why `5 ft` does not come back as `5.0 ft`.",
      signature: "def answer(query: str) -> str",
      prompt: [
        'Put a text interface on it. A query is a number, a unit, the word `in` or `to`, and another unit: `"5 ft in m"`. Return the answer as `"5 ft = 1.52 m"`: the number exactly as it was written, then the result rounded to 2 decimal places with both decimals shown (`f"{result:.2f}"`).',
        'Words are separated by any amount of whitespace. Split into words rather than on the text `" in "`, because an inch is written `in` too, and `"12 in in cm"` is a fair question.',
        "Anything that is not four words with `in` or `to` third, a number that does not parse, and a conversion `convert` refuses all raise `ValueError`.",
      ],
      starter: `${UNITS_TEMPERATURE}

def answer(query: str) -> str:
    parts = query.split()
    # A number, a unit, "in" or "to", then the unit to convert to.
    return ""
`,
      solution: `${UNITS_TEMPERATURE}

def answer(query: str) -> str:
    parts = query.split()
    if len(parts) != 4 or parts[2] not in ("in", "to"):
        raise ValueError("expected a query like '5 ft in m', got " + repr(query))
    number, from_unit, _, to_unit = parts
    result = convert(float(number), from_unit, to_unit)
    return f"{number} {from_unit} = {result:.2f} {to_unit}"
`,
      tests: pyCases("answer", [
        { id: "feet", name: "A simple query", args: ["5 ft in m"], expected: "5 ft = 1.52 m" },
        {
          id: "to",
          name: "The word to works as well as in",
          args: ["2.5 km to mi"],
          expected: "2.5 km = 1.55 mi",
        },
        {
          id: "zeros",
          name: "Two decimal places, even when they are zero",
          args: ["1500 m in km"],
          expected: "1500 m = 1.50 km",
        },
        {
          id: "inches",
          name: "An inch is also written in",
          description: "Splitting on the text \" in \" breaks this query.",
          args: ["12 in in cm"],
          expected: "12 in = 30.48 cm",
        },
        {
          id: "spacing",
          name: "Extra whitespace between words",
          args: ["  72 F   in   K "],
          expected: "72 F = 295.37 K",
        },
        {
          id: "negative",
          name: "A negative temperature",
          args: ["-40 C in F"],
          expected: "-40 C = -40.00 F",
        },
        {
          id: "incomplete",
          name: "A query with no target unit",
          args: ["5 ft"],
          throws: { py: "ValueError" },
        },
        {
          id: "impossible",
          name: "A conversion that makes no sense",
          args: ["5 ft in C"],
          throws: { py: "ValueError" },
        },
      ]),
    },
  ],
);

export const CODE_MULTI_PYTHON_APPS: Challenge[] = [
  EXPENSE_SPLITTER,
  TEMPLATE_ENGINE,
  GRADEBOOK,
  TIC_TAC_TOE_REFEREE,
  CALENDAR_FREE_SLOTS,
  SPELL_CHECKER,
  SUDOKU_VALIDATOR,
  UNIT_CONVERTER,
];
