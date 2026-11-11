// Runs every snippet behind the be-object-design video in Pyodide 314.0.7
// (Python 3.14), the runtime the Object-Oriented Design page's blocks run in
// the reader's browser, and writes what came back to results.json, which
// data.ts reads. From the repo root:
//
//   node video/src/videos/be-object-design/check.mjs
//
// Nothing here is random or timed, so every run writes the same file. The
// video argues through a small shop rather than through code, and none of
// the code below is shown on screen: it is what makes each claim a run
// rather than an assertion.
//
//   - encapsulation: the page's BankAccount as it stood before #725, then
//     the three holes the video's answer closes: an opening balance of -50
//     is accepted, a withdrawal of -30 adds thirty, and the read-only
//     property refuses an assignment.
//   - encapsulationGuarded: the page's BankAccount as it is now, verbatim,
//     which checks the constructor too: it still prints 70, and refuses an
//     opening balance of -50 (the figure's guarded door).
//   - polymorphism: the page's total_area block (7.14).
//   - strategy: the page's Shipment block (5.0 and 6.0).
//   - liskov: the page's Rectangle with set_width / set_height and a Square
//     that keeps its sides equal (the video's own few lines, after the
//     page's description); a caller sets width 5 and height 4 and expects 20.
//   - fragile: the video's own shop cart. A LoyaltyCart subclass counts items
//     in add(); the cart's add_all() first calls add() per item, then is
//     "sped up" to extend its list directly. The same subclass, untouched,
//     before and after; and a LoyaltyCounter that holds a cart and delegates
//     (composition), before and after.
//   - notifiers: channels x timings as subclasses against channel + timing
//     as parts (itertools.product, the names listed for the figure).
//   - dip: the page's Report, given a fake sender that records what it is
//     asked to send.
//   - factory: the page's make_parser, with two stand-in parser classes.
//   - singleton: the video's own config singleton and two tests, run in
//     order and each alone, with the result of each.
//   - observer: the video's own order subject and three subscribers, then a
//     fourth added without touching the subject; then the same four on one
//     order, with analytics broken: placing the order raises, and loyalty,
//     after analytics in the list, never hears.
/* global console */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../../../package.json"));
const { loadPyodide } = require("pyodide");
const py = await loadPyodide();

py.runPython(`
import contextlib, io, json, sys

def _run(code, ns):
    """Runs code in ns; returns its printed lines, or the error it raised."""
    buf = io.StringIO()
    try:
        with contextlib.redirect_stdout(buf):
            exec(code, ns)
        return {"ok": True, "printed": buf.getvalue().splitlines()}
    except Exception as e:
        return {"ok": False, "printed": buf.getvalue().splitlines(), "error": f"{type(e).__name__}: {e}"}

def figure(setup, steps):
    ns = {}
    exec(setup, ns)
    return {"setup": setup, "steps": {sid: {"code": code, **_run(code, ns)} for sid, code in steps}}
`);

const figure = (setup, steps) => {
  py.globals.set("_setup", setup);
  py.globals.set("_steps", py.toPy(Object.entries(steps)));
  return JSON.parse(py.runPython("json.dumps(figure(_setup, _steps))"));
};

const R = { runtime: py.runPython("import sys; sys.version.split()[0]"), figures: {} };

// ── Encapsulation: the page's class, verbatim ───────────────────────────────
const BANK = `class BankAccount:
    def __init__(self, balance=0):
        self._balance = balance          # "internal", not to be poked directly

    def withdraw(self, amount):
        if amount > self._balance:
            raise ValueError("insufficient funds")
        self._balance -= amount

    @property
    def balance(self):                   # read-only view of internal state
        return self._balance
`;
R.figures.encapsulation = figure(BANK, {
  page: "acct = BankAccount(100)\nacct.withdraw(30)\nprint(acct.balance)",
  overdraw: "acct = BankAccount(100)\nacct.withdraw(200)",
  opening: "print(BankAccount(-50).balance)",
  negative: "acct = BankAccount(100)\nacct.withdraw(-30)\nprint(acct.balance)",
  readonly: "acct = BankAccount(100)\nacct.balance = 1_000_000",
});

// The page's class as it is now: every way in is checked, the constructor too.
R.figures.encapsulationGuarded = figure(
  `class BankAccount:
    def __init__(self, balance=0):
        if balance < 0:
            raise ValueError("starting balance can't be negative")
        self._balance = balance          # "internal", not to be poked directly

    def withdraw(self, amount):
        if amount <= 0:
            raise ValueError("amount must be positive")
        if amount > self._balance:
            raise ValueError("insufficient funds")
        self._balance -= amount

    @property
    def balance(self):                   # read-only view of internal state
        return self._balance
`,
  {
    page: "acct = BankAccount(100)\nacct.withdraw(30)\nprint(acct.balance)",
    opening: "BankAccount(-50)",
  },
);

// ── Polymorphism: the page's block ──────────────────────────────────────────
R.figures.polymorphism = figure(
  `import math

class Circle:
    def __init__(self, r):
        self.r = r
    def area(self):
        return math.pi * self.r ** 2

class Square:
    def __init__(self, s):
        self.s = s
    def area(self):
        return self.s ** 2

def total_area(shapes):
    return sum(shape.area() for shape in shapes)   # duck typing
`,
  { page: "print(round(total_area([Circle(1), Square(2)]), 2))" },
);

// ── Strategy: the page's block ──────────────────────────────────────────────
R.figures.strategy = figure(
  `class FlatRate:
    def cost(self, weight):
        return 5.0

class ByWeight:
    def cost(self, weight):
        return weight * 2.0

class Shipment:
    def __init__(self, weight, strategy):
        self.weight = weight
        self.strategy = strategy         # inject the algorithm
    def price(self):
        return self.strategy.cost(self.weight)
`,
  {
    page: "print(Shipment(3, FlatRate()).price())\nprint(Shipment(3, ByWeight()).price())",
    // A third rule arrives as a new class; Shipment is not edited.
    third: "class FreeOverTen:\n    def cost(self, weight):\n        return 0.0 if weight > 10 else 5.0\n\nprint(Shipment(3, FreeOverTen()).price())\nprint(Shipment(12, FreeOverTen()).price())",
  },
);

// ── Liskov: the page's Rectangle and Square ─────────────────────────────────
R.figures.liskov = figure(
  `class Rectangle:
    def __init__(self, width, height):
        self.width, self.height = width, height
    def set_width(self, w):
        self.width = w
    def set_height(self, h):
        self.height = h
    def area(self):
        return self.width * self.height

class Square(Rectangle):                 # forces width == height
    def __init__(self, side):
        super().__init__(side, side)
    def set_width(self, w):
        self.width = self.height = w
    def set_height(self, h):
        self.width = self.height = h

def resize(r):
    """A caller written against Rectangle: widen, then set the height."""
    r.set_width(5)
    r.set_height(4)
    return r.area()                       # a rectangle's promise: 5 x 4 = 20
`,
  {
    rectangle: "print(resize(Rectangle(2, 3)))",
    square: "print(resize(Square(3)))",
  },
);

// ── The fragile base class: the video's own cart ────────────────────────────
const CART_V1 = `class Cart:
    def __init__(self):
        self.items = []
    def add(self, item):
        self.items.append(item)
    def add_all(self, items):
        for item in items:
            self.add(item)
`;
// The cart team's change: add_all no longer goes through add.
const CART_V2 = `class Cart:
    def __init__(self):
        self.items = []
    def add(self, item):
        self.items.append(item)
    def add_all(self, items):
        self.items.extend(items)          # faster: one call, not one per item
`;
const LOYALTY = `
class LoyaltyCart(Cart):                  # inheritance: counts inside add()
    def __init__(self):
        super().__init__()
        self.counted = 0
    def add(self, item):
        self.counted += 1
        super().add(item)

class LoyaltyCounter:                     # composition: holds a cart
    def __init__(self, cart):
        self.cart = cart
        self.counted = 0
    def add(self, item):
        self.counted += 1
        self.cart.add(item)
    def add_all(self, items):
        items = list(items)
        self.counted += len(items)
        self.cart.add_all(items)
`;
/** Three items, added in one call. Each step prints (items in the cart, items counted). */
const BASKET = '["tea", "jam", "bread"]';
const fragileSteps = {
  inherits: `c = LoyaltyCart()\nc.add_all(${BASKET})\nprint(len(c.items), c.counted)`,
  composes: `c = LoyaltyCounter(Cart())\nc.add_all(${BASKET})\nprint(len(c.cart.items), c.counted)`,
};
R.figures.fragileBefore = figure(CART_V1 + LOYALTY, fragileSteps);
R.figures.fragileAfter = figure(CART_V2 + LOYALTY, fragileSteps);

// ── Combining behaviors: subclasses per pair, or one part per choice ────────
R.notifiers = JSON.parse(
  py.runPython(`
from itertools import product
channels = ["email", "text", "push"]
timings = ["now", "daily digest", "quiet hours"]
def count(ch, ti):
    return {
        "subclasses": [f"{c.title()}{t.title().replace(' ', '')}Notifier" for c, t in product(ch, ti)],
        "parts": len(ch) + len(ti),
    }
three = count(channels, timings)
four = count(channels + ["in-app"], timings)
json.dumps({
    "channels": channels, "timings": timings, "added": "in-app",
    "inheritance": [len(three["subclasses"]), len(four["subclasses"])],
    "composition": [three["parts"], four["parts"]],
    "names": three["subclasses"],
})
`),
);

// ── Dependency inversion: the page's Report, with a fake ───────────────────
R.figures.dip = figure(
  `class Report:
    def __init__(self, sender):        # depends on an abstraction
        self.sender = sender
    def deliver(self, text):
        self.sender.send(text)

class FakeSender:                      # what a test passes in
    def __init__(self):
        self.sent = []
    def send(self, text):
        self.sent.append(text)
`,
  { test: 'fake = FakeSender()\nReport(fake).deliver("Order 1042 confirmed")\nprint(fake.sent)' },
);

// ── Factory: the page's make_parser ─────────────────────────────────────────
R.figures.factory = figure(
  `class JsonParser: pass
class CsvParser: pass

def make_parser(kind):
    parsers = {"json": JsonParser, "csv": CsvParser}
    try:
        return parsers[kind]()      # caller doesn't know the concrete class
    except KeyError:
        raise ValueError(f"unknown parser: {kind}")
`,
  { csv: 'print(type(make_parser("csv")).__name__)', xml: 'make_parser("xml")' },
);

// ── Singleton: the video's own config, and two tests ────────────────────────
const SINGLETON = `class Config:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.currency = "USD"
        return cls._instance

def test_prices_in_euros():
    Config().currency = "EUR"
    assert Config().currency == "EUR"

def test_default_currency():
    assert Config().currency == "USD", f"currency is {Config().currency}"

def run(tests):
    Config._instance = None             # a fresh process
    out = []
    for t in tests:
        try:
            t()
            out.append(f"{t.__name__}: pass")
        except AssertionError as e:
            out.append(f"{t.__name__}: FAIL ({e})")
    print(out)
`;
R.figures.singleton = figure(SINGLETON, {
  alone: "run([test_default_currency])",
  inOrder: "run([test_prices_in_euros, test_default_currency])",
});

// ── Observer: the video's own order ─────────────────────────────────────────
R.figures.observer = figure(
  `class Order:
    def __init__(self):
        self._subscribers = []
    def subscribe(self, fn):
        self._subscribers.append(fn)
    def place(self, number):
        for notify in self._subscribers:   # it knows none of their types
            notify(number)

heard = []
order = Order()
order.subscribe(lambda n: heard.append(f"email: confirm {n}"))
order.subscribe(lambda n: heard.append(f"stock: reserve {n}"))
order.subscribe(lambda n: heard.append(f"analytics: count {n}"))
`,
  {
    place: "order.place(1042)\nprint(heard)",
    fourth: 'heard.clear()\norder.subscribe(lambda n: heard.append(f"loyalty: points for {n}"))\norder.place(1043)\nprint(heard)',
    // The same four, called inside place(), with analytics broken.
    fails: `heard.clear()
def analytics(n):
    raise RuntimeError("analytics is down")
broken = Order()
broken.subscribe(lambda n: heard.append(f"email: confirm {n}"))
broken.subscribe(lambda n: heard.append(f"stock: reserve {n}"))
broken.subscribe(analytics)
broken.subscribe(lambda n: heard.append(f"loyalty: points for {n}"))
try:
    broken.place(1043)
    print("placed")
except RuntimeError as e:
    print(f"place(1043) raised: {e}")
print(heard)`,
  },
);

// ── Checks: the claims the narration makes stand on these ───────────────────
const fail = (msg) => {
  throw new Error(`be-object-design check: ${msg}`);
};
const out = (fig, id) => {
  const s = R.figures[fig].steps[id];
  if (!s) fail(`no step ${fig}.${id}`);
  return s;
};
const printed = (fig, id) => {
  const s = out(fig, id);
  if (!s.ok) fail(`${fig}.${id} raised ${s.error}`);
  return s.printed.join("\n");
};
const raised = (fig, id) => {
  const s = out(fig, id);
  if (s.ok) fail(`${fig}.${id} should have raised`);
  return s.error;
};
if (printed("encapsulation", "page") !== "70") fail("the page's account should print 70");
if (!raised("encapsulation", "overdraw").startsWith("ValueError: insufficient funds")) fail("overdraw");
if (printed("encapsulation", "opening") !== "-50") fail("an opening balance of -50 should be accepted");
if (printed("encapsulation", "negative") !== "130") fail("a withdrawal of -30 should add 30");
if (!raised("encapsulation", "readonly").startsWith("AttributeError")) fail("balance should be read-only");
if (printed("polymorphism", "page") !== "7.14") fail("total area");
if (printed("strategy", "page") !== "5.0\n6.0") fail("strategy");
if (printed("strategy", "third") !== "5.0\n0.0") fail("third strategy");
if (printed("liskov", "rectangle") !== "20" || printed("liskov", "square") !== "16") fail("liskov");
if (printed("fragileBefore", "inherits") !== "3 3") fail("loyalty cart before");
if (printed("fragileAfter", "inherits") !== "3 0") fail("loyalty cart after");
if (printed("fragileBefore", "composes") !== "3 3" || printed("fragileAfter", "composes") !== "3 3") fail("counter");
if (R.notifiers.inheritance.join() !== "9,12" || R.notifiers.composition.join() !== "6,7") fail("notifiers");
if (printed("dip", "test") !== "['Order 1042 confirmed']") fail("dip");
if (printed("factory", "csv") !== "CsvParser" || raised("factory", "xml") !== "ValueError: unknown parser: xml") {
  fail("factory");
}
if (!printed("singleton", "alone").includes("test_default_currency: pass")) fail("singleton alone");
if (!printed("singleton", "inOrder").includes("test_default_currency: FAIL (currency is EUR)")) fail("singleton order");
if (!printed("observer", "fourth").includes("loyalty")) fail("observer");
if (printed("encapsulationGuarded", "page") !== "70") fail("the page's guarded account should print 70");
if (raised("encapsulationGuarded", "opening") !== "ValueError: starting balance can't be negative") fail("the guarded constructor");
{
  const [said, who] = printed("observer", "fails").split("\n");
  if (said !== "place(1043) raised: analytics is down") fail(`a broken listener should fail the order, got ${said}`);
  if (who.includes("loyalty") || !who.includes("stock")) fail(`loyalty should never hear, got ${who}`);
}

const file = join(here, "results.json");
writeFileSync(file, `${JSON.stringify(R, null, 2)}\n`);
console.log(`wrote ${file}`);
console.log(
  [
    `account: page ${printed("encapsulation", "page")}, opening -50 -> ${printed("encapsulation", "opening")}, withdraw -30 -> ${printed("encapsulation", "negative")}`,
    `area ${printed("polymorphism", "page")}; shipping ${printed("strategy", "page").replace("\n", " / ")}`,
    `liskov ${printed("liskov", "rectangle")} vs ${printed("liskov", "square")}`,
    `loyalty (items, counted): before ${printed("fragileBefore", "inherits")}, after ${printed("fragileAfter", "inherits")}; composed ${printed("fragileAfter", "composes")}`,
    `notifiers: inheritance ${R.notifiers.inheritance}, composition ${R.notifiers.composition}`,
    `singleton: ${printed("singleton", "inOrder")}`,
  ].join("\n"),
);
