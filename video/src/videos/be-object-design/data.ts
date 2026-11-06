import results from "./results.json" with { type: "json" };

// Every value the video shows, read from results.json: what check.mjs got
// back from Pyodide (Python 3.14) for the page's own blocks (BankAccount,
// total_area, Shipment, Report, make_parser) and for the video's own shop
// (the loyalty cart, the notifiers, the config singleton, the order's
// subscribers). No code is drawn: the scenes show the shop, and these are
// the outcomes they label. Pure (no Remotion, no DOM).

export const VIDEO = "be-object-design";

/**
 * Whether public/images/be-object-design/ holds the watercolors from
 * illustrations.json. They are generated in phase 2; every frame is laid out
 * with room for them either way.
 */
export const ILLUSTRATIONS = false;

export const PYTHON = results.runtime;

type Step = { code: string; ok: boolean; printed: string[]; error?: string };
type Figure = { setup: string; steps: Record<string, Step> };
const FIGURES = results.figures as unknown as Record<string, Figure>;

const step = (figure: string, id: string): Step => {
  const s = FIGURES[figure]?.steps[id];
  if (!s) throw new Error(`results.json has no step ${id} in ${figure}`);
  return s;
};
/** What a step printed, one string per line; throws if it raised. */
const printed = (figure: string, id: string) => {
  const s = step(figure, id);
  if (!s.ok) throw new Error(`${figure}.${id} raised ${s.error}`);
  return s.printed;
};
/** The error a step raised, as Python names it; throws if it did not. */
const raised = (figure: string, id: string) => {
  const s = step(figure, id);
  if (s.ok || !s.error) throw new Error(`${figure}.${id} was expected to raise`);
  return s.error;
};
/** "3 0" → [3, 0]. */
const pair = (line: string) => line.split(" ").map(Number) as [number, number];

// ── 2. Composition over inheritance ─────────────────────────────────────────

/** Three items added in one call: [in the cart, counted], before and after
 *  the cart's add-all stops calling add. */
export const LOYALTY = {
  items: 3,
  inheritsBefore: pair(printed("fragileBefore", "inherits")[0]),
  inheritsAfter: pair(printed("fragileAfter", "inherits")[0]),
  composesBefore: pair(printed("fragileBefore", "composes")[0]),
  composesAfter: pair(printed("fragileAfter", "composes")[0]),
};

export const NOTIFIERS = results.notifiers as {
  channels: string[];
  timings: string[];
  added: string;
  /** Subclasses, one per pair: three channels, then four. */
  inheritance: [number, number];
  /** Parts, one per choice: three channels, then four. */
  composition: [number, number];
  /** The nine subclass names, for the grid. */
  names: string[];
};

// ── 3. Liskov ───────────────────────────────────────────────────────────────

/** Width set to 5, then height to 4: what a caller gets back. */
export const LISKOV = {
  width: 5,
  height: 4,
  rectangle: Number(printed("liskov", "rectangle")[0]),
  square: Number(printed("liskov", "square")[0]),
};

// ── 5. Dependency inversion ─────────────────────────────────────────────────

/** What the test's fake recorded: ["Order 1042 confirmed"]. */
export const FAKE_SENT = printed("dip", "test")[0];

// ── 6. Strategy ─────────────────────────────────────────────────────────────

const [flat, byWeight] = printed("strategy", "page").map(Number);
const [freeLight, freeHeavy] = printed("strategy", "third").map(Number);
export const SHIPPING = {
  weight: 3,
  flat,
  byWeight,
  /** The third rule, a new class: free above a weight of 10. */
  third: { light: { weight: 3, cost: freeLight }, heavy: { weight: 12, cost: freeHeavy } },
};

// ── 7. Observer ─────────────────────────────────────────────────────────────

/** Who heard order 1042, then who heard 1043 once a fourth subscribed. */
export const OBSERVER = {
  first: printed("observer", "place")[0],
  withFourth: printed("observer", "fourth")[0],
};

// ── Quick round ─────────────────────────────────────────────────────────────

export const ACCOUNT = {
  /** The page's own run: 100, withdraw 30. */
  page: Number(printed("encapsulation", "page")[0]),
  overdraw: raised("encapsulation", "overdraw"),
  /** BankAccount(-50): the constructor checks nothing. */
  opening: Number(printed("encapsulation", "opening")[0]),
  /** 100, withdraw -30: a negative withdrawal is a deposit. */
  negativeWithdrawal: Number(printed("encapsulation", "negative")[0]),
  readonly: raised("encapsulation", "readonly"),
};

export const TOTAL_AREA = Number(printed("polymorphism", "page")[0]);

export const FACTORY = {
  csv: printed("factory", "csv")[0],
  xml: raised("factory", "xml"),
};

/** The config singleton's two tests: alone, and after the one that sets EUR. */
export const SINGLETON = {
  alone: printed("singleton", "alone")[0],
  inOrder: printed("singleton", "inOrder")[0],
};
