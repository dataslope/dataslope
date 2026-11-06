// Runs every piece of code the be-code-review video shows, in Pyodide 314.0.7
// (Python 3.14), the runtime the Backend Engineer pages' blocks run in the
// reader's browser, and writes what came back to results.json, which data.ts
// reads. From the repo root, where the pyodide package is installed:
//
//   node video/src/videos/be-code-review/check.mjs
//
// The worked example is the page's own (content/interview/backend-engineer/
// ai-assisted-coding.mdx, "How do you review code an assistant wrote?"): the
// eight-line merge_intervals an assistant returned. check.mjs reads that
// listing out of the page and fails if the code it runs is not the page's,
// character for character. The rest is the video's own, and script.ts says
// so:
//   - the assistant's test file: the page's "obvious test" (the example it
//     says the code handles correctly) and a second test that asserts
//     touching intervals stay apart, standing for the page's "tests that
//     agree with the bug";
//   - the bug report (the page's three intervals, out of order), its smallest
//     reproduction, a traced copy of the function, a symptom patch, and the
//     reviewer's three tests.
//
// Every listing is written to Pyodide's file system as intervals.py and
// test_intervals.py and imported, so what the screen shows is what ran. The
// tests are run by calling each test function: no pytest, and no pytest
// output is shown. Every diff on screen is difflib's, from the two versions.
//
// Then it reads script.ts and exits non-zero if the narration no longer says
// what the runs gave (the line count, the report's result, the reproduction).
/* global console, process, URL */
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide();

// ── The page's listing ──────────────────────────────────────────────────────

const page = readFileSync(join(here, "../../../../content/interview/backend-engineer/ai-assisted-coding.mdx"), "utf8");
const reviewSection = page.slice(page.indexOf("### How do you review code an assistant wrote?"));
const fence = reviewSection.match(/```python\n([\s\S]*?)```/);
if (!fence) throw new Error("the page's review question no longer has a python listing");
const PAGE_CODE = fence[1];

/** Facts the narration takes from the page's prose, each found in the page as
 *  written (line breaks in the page read as spaces). */
const prose = page.replace(/\s+/g, " ");
const PAGE_SAYS = {
  survey66: '66% of respondents named "AI solutions that are almost right, but not quite" as their top frustration',
  survey45: "45% said debugging AI-generated code takes longer than expected",
  surveyName: "Stack Overflow's 2025 developer survey",
  googlePilot: 'Google\'s pilot frames the task as "read, debug and optimize" an existing codebase',
  fewHundred: "often a few hundred lines",
  stranger: "Like a pull request from a capable stranger",
  supplyChain: "A hallucinated package name is also a supply-chain risk, because an attacker can register it",
  threeBugs: "A reviewer should find three bugs, none of which the obvious test exercises",
  whereToLook: "Each is a boundary or an unstated assumption, which is where to look first",
  notStep2: "It is not a substitute for step 2",
};
const missing = Object.entries(PAGE_SAYS).filter(([, s]) => !prose.includes(s));
if (missing.length) throw new Error(`the page no longer says: ${missing.map(([k]) => k).join(", ")}`);

// ── The video's own listings ────────────────────────────────────────────────

/** The assistant's tests: the page's example, and one that writes the bug
 *  down as a requirement. */
const ASSISTANT_TESTS = `from intervals import merge_intervals


def test_merges_overlapping():
    assert merge_intervals([[1, 3], [2, 6], [8, 10]]) == [[1, 6], [8, 10]]


def test_adjacent_intervals_stay_separate():
    assert merge_intervals([[1, 2], [2, 3]]) == [[1, 2], [2, 3]]
`;

/** The reviewer's: the obvious test kept, the bug-agreeing one replaced by
 *  the three the review asks for. */
const REVIEW_TESTS = `from intervals import merge_intervals


def test_merges_overlapping():
    assert merge_intervals([[1, 3], [2, 6], [8, 10]]) == [[1, 6], [8, 10]]


def test_unsorted_input():
    assert merge_intervals([[8, 10], [1, 3], [2, 6]]) == [[1, 6], [8, 10]]


def test_touching_intervals_merge():
    assert merge_intervals([[1, 2], [2, 3]]) == [[1, 3]]


def test_contained_interval_is_kept():
    assert merge_intervals([[1, 10], [2, 3]]) == [[1, 10]]
`;

py.globals.set("PAGE_CODE", PAGE_CODE);
py.globals.set("ASSISTANT_TESTS", ASSISTANT_TESTS);
py.globals.set("REVIEW_TESTS", REVIEW_TESTS);

const out = py.runPython(String.raw`
import ast, contextlib, difflib, importlib, io, itertools, json, os, sys

sys.dont_write_bytecode = True
WORK = "/review"
os.makedirs(WORK, exist_ok=True)
os.chdir(WORK)
sys.path.insert(0, WORK)

def edit(src, old, new):
    assert src.count(old) == 1, (old, src)
    return src.replace(old, new)

ASSISTANT = PAGE_CODE
# The debugging round's fix: the cause, the missing sort.
SORTED = edit(ASSISTANT, "in intervals:", "in sorted(intervals):")
# The review's fix: the sort, <=, and the larger end.
FIXED = edit(edit(SORTED, "start < merged", "start <= merged"),
             "merged[-1][1] = end", "merged[-1][1] = max(merged[-1][1], end)")
# Step 3: the same function, printing its state after each interval.
TRACED = edit(ASSISTANT, "    return merged", '        print([start, end], "->", merged)\n    return merged')
# Step 4, the wrong way: hide intervals that end before they start.
SYMPTOM = edit(ASSISTANT, "    return merged", "    return [iv for iv in merged if iv[0] <= iv[1]]")

def write(name, text):
    with open(os.path.join(WORK, name), "w") as f:
        f.write(text)
    for m in ("intervals", "test_intervals"):
        sys.modules.pop(m, None)
    importlib.invalidate_caches()

def load(source):
    write("intervals.py", source)
    return importlib.import_module("intervals")

def call(source, arg):
    """merge_intervals(arg) in a fresh import of source, with what it printed."""
    mod = load(source)
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        try:
            got = mod.merge_intervals(json.loads(json.dumps(arg)))
            res = {"ok": True, "value": got, "repr": repr(got)}
        except Exception as e:
            res = {"ok": False, "error": f"{type(e).__name__}: {e}"}
    res["arg"] = repr(arg)
    res["stdout"] = buf.getvalue().splitlines()
    return res

def run_tests(source, tests):
    """Each test function in tests, run against source: passed or failed, and
    for a failure what the call returned."""
    load(source)
    write("test_intervals.py", tests)
    load(source)
    mod = importlib.import_module("test_intervals")
    rows = []
    for fn in [n for n in ast.parse(tests).body if isinstance(n, ast.FunctionDef)]:
        test = fn.body[0].test
        call_src, expected = ast.unparse(test.left), ast.unparse(test.comparators[0])
        got = eval(call_src, vars(mod))
        try:
            getattr(mod, fn.name)()
            ok = True
        except AssertionError:
            ok = False
        rows.append({"name": fn.name, "call": call_src, "expected": expected, "got": repr(got), "ok": ok})
    return {"passed": sum(r["ok"] for r in rows), "failed": sum(not r["ok"] for r in rows), "tests": rows}

def diff(a, b, name):
    return list(difflib.unified_diff(a.splitlines(), b.splitlines(), f"a/{name}", f"b/{name}", lineterm="", n=1))

def added(source):
    """A new file as the diff shows it: every line added."""
    return ["+" + l for l in source.splitlines()]

def reversed_end(v):
    return any(e < s for s, e in v)

r = {"runtime": f"Pyodide / Python {sys.version.split()[0]}"}

r["listings"] = {
    "assistant": ASSISTANT.splitlines(),
    "assistantTests": ASSISTANT_TESTS.splitlines(),
    "reviewTests": REVIEW_TESTS.splitlines(),
    "traced": TRACED.splitlines(),
}
r["lines"] = len(ASSISTANT.splitlines())
r["diffs"] = {
    # The diff as it arrived: two new files.
    "arrived": {"intervals.py": added(ASSISTANT), "test_intervals.py": added(ASSISTANT_TESTS)},
    "trace": diff(ASSISTANT, TRACED, "intervals.py"),
    "symptom": diff(ASSISTANT, SYMPTOM, "intervals.py"),
    "cause": diff(ASSISTANT, SORTED, "intervals.py"),
    "fix": diff(ASSISTANT, FIXED, "intervals.py"),
    "tests": diff(ASSISTANT_TESTS, REVIEW_TESTS, "test_intervals.py"),
}

PAGE_EXAMPLE = [[1, 3], [2, 6], [8, 10]]
REPORT = [[8, 10], [1, 3], [2, 6]]
REPRO = [[3, 4], [1, 2]]
TOUCHING = [[1, 2], [2, 3]]
CONTAINED = [[1, 10], [2, 3]]

# The opening: the assistant's own tests pass.
r["arrived"] = run_tests(ASSISTANT, ASSISTANT_TESTS)

# Question 2, the debugging round.
r["debug"] = {
    "example": call(ASSISTANT, PAGE_EXAMPLE),
    "report": call(ASSISTANT, REPORT),
    "repro": call(ASSISTANT, REPRO),
    "trace": call(TRACED, REPRO),
    "hypothesis": call(ASSISTANT, sorted(REPRO)),
    "symptomReport": call(SYMPTOM, REPORT),
    "symptomRepro": call(SYMPTOM, REPRO),
    "causeReport": call(SORTED, REPORT),
    "causeRepro": call(SORTED, REPRO),
    "causeTests": run_tests(SORTED, ASSISTANT_TESTS),
}
# The reproduction is the smallest: every input of one or two intervals with
# ends in 0..4, searched for an output that ends before it starts.
spans = [[s, e] for s in range(5) for e in range(s, 5)]
merge = load(ASSISTANT).merge_intervals
def bad(k):
    found = []
    for combo in itertools.product(spans, repeat=k):
        v = merge([list(x) for x in combo])
        if reversed_end(v):
            found.append([list(x) for x in combo])
    return found
one, two = bad(1), bad(2)
assert REPRO in two
r["debug"]["search"] = {"spans": len(spans), "oneInterval": len(one), "twoIntervals": len(two), "inputsOfTwo": len(spans) ** 2}

# Question 1: an invented parameter fails as soon as its line runs. The
# card's call is pandas' inplace=True, given to a plain list's sort.
LOUD = "intervals = [[8, 10], [1, 3]]\nintervals.sort(inplace=True)"
try:
    exec(LOUD, {})
    r["loud"] = {"code": LOUD.splitlines(), "ok": True}
except Exception as e:
    r["loud"] = {"code": LOUD.splitlines(), "ok": False, "error": f"{type(e).__name__}: {e}"}

# Question 3, the review.
r["review"] = {
    "touching": call(ASSISTANT, TOUCHING),
    "contained": call(ASSISTANT, CONTAINED),
    "empty": call(ASSISTANT, []),
    "single": call(ASSISTANT, [[5, 5]]),
    "fixed": {name: call(FIXED, arg) for name, arg in
              [("example", PAGE_EXAMPLE), ("report", REPORT), ("touching", TOUCHING),
               ("contained", CONTAINED), ("empty", []), ("single", [[5, 5]])]},
    # The assistant's tests on the fixed code: the second asserts the bug.
    "assistantTestsOnFix": run_tests(FIXED, ASSISTANT_TESTS),
    # The reviewer's tests on each version: they fail without the change.
    "reviewTestsOnAssistant": run_tests(ASSISTANT, REVIEW_TESTS),
    "reviewTestsOnSorted": run_tests(SORTED, REVIEW_TESTS),
    "reviewTestsOnFix": run_tests(FIXED, REVIEW_TESTS),
}

json.dumps(r)
`);

const results = JSON.parse(out);
results.pageSays = PAGE_SAYS;

// ── What the runs must show, or the narration is wrong ──────────────────────

const d = results.debug;
const rv = results.review;
const expect = [
  ["the assistant's tests pass", results.arrived.passed === 2 && results.arrived.failed === 0],
  ["an invented parameter fails loudly", results.loud.ok === false && results.loud.error.startsWith("TypeError")],
  ["the page's example is right", d.example.repr === "[[1, 6], [8, 10]]"],
  ["the report ends before it starts", d.report.repr === "[[8, 6]]"],
  ["the reproduction gives three to two", d.repro.repr === "[[3, 2]]"],
  ["no single interval reproduces it", d.search.oneInterval === 0],
  ["the trace goes wrong on the second", d.trace.stdout.join("|") === "[3, 4] -> [[3, 4]]|[1, 2] -> [[3, 2]]"],
  ["sorting first fixes the reproduction", d.hypothesis.repr === "[[1, 2], [3, 4]]"],
  ["the symptom patch returns nothing", d.symptomReport.repr === "[]" && d.symptomRepro.repr === "[]"],
  ["the sort fixes the report", d.causeReport.repr === "[[1, 6], [8, 10]]" && d.causeRepro.repr === "[[1, 2], [3, 4]]"],
  ["the old tests pass after the sort", d.causeTests.passed === 2],
  ["touching intervals stay apart", rv.touching.repr === "[[1, 2], [2, 3]]"],
  ["a contained interval shrinks", rv.contained.repr === "[[1, 3]]"],
  ["empty and single are fine", rv.empty.repr === "[]" && rv.single.repr === "[[5, 5]]"],
  ["the fix is right everywhere", rv.fixed.touching.repr === "[[1, 3]]" && rv.fixed.contained.repr === "[[1, 10]]" && rv.fixed.report.repr === "[[1, 6], [8, 10]]"],
  ["the assistant's second test fails on the fix", rv.assistantTestsOnFix.tests[1].ok === false && rv.assistantTestsOnFix.tests[0].ok === true],
  ["the three new tests fail on the assistant's code", rv.reviewTestsOnAssistant.tests.slice(1).every((t) => !t.ok)],
  ["the sort alone passes one of the three", rv.reviewTestsOnSorted.tests.slice(1).filter((t) => t.ok).length === 1],
  ["the three new tests pass on the fix", rv.reviewTestsOnFix.failed === 0],
];
const broken = expect.filter(([, ok]) => !ok);
if (broken.length) {
  console.error(`a run no longer shows what the video says:\n${broken.map(([w]) => `  ${w}`).join("\n")}`);
  process.exit(1);
}

writeFileSync(new URL("./results.json", import.meta.url), `${JSON.stringify(results, null, 2)}\n`);
console.log(`${results.runtime}: ${expect.length} runs as the video says them`);
console.log(`report ${d.report.repr}, repro ${d.repro.repr}, symptom ${d.symptomReport.repr}, fix ${rv.fixed.report.repr}`);
console.log(`two-interval inputs that end before they start: ${d.search.twoIntervals} of ${d.search.inputsOfTwo}`);

// The narration says these in words; a run that changes must change them.
const { script } = await import(new URL("./script.ts", import.meta.url).href);
const text = (id) => {
  const beat = script.beats.find((b) => b.id === id);
  if (!beat) throw new Error(`script.ts has no beat ${id}`);
  return beat.text.toLowerCase();
};
const WORDS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const claims = [
  ["plan", `${WORDS[results.lines]} lines`],
  ["plan", "both pass"],
  ["bugs-survey", "sixty-six percent"],
  ["bugs-survey", "forty-five percent"],
  ["debug-report", "from eight to six"],
  ["debug-repro", "three to two"],
  ["debug-symptom", "empty list"],
  ["review-contain", "becomes one to three"],
];
const wrong = claims.filter(([id, words]) => !text(id).includes(words));
if (wrong.length) {
  console.error(`the narration no longer says what the runs give:\n${wrong.map(([id, w]) => `  ${id}: "${w}"`).join("\n")}`);
  process.exit(1);
}
console.log(`narration agrees: ${claims.map(([, w]) => w).join(", ")}`);
