import { ds, inkOf } from "../../theme/brand";
import { BLUE_INK } from "../../editorial/style";

export const VIDEO = "simpsons-paradox";

/**
 * Berkeley graduate admissions, 1973, in the six largest departments: R's
 * `UCBAdmissions` table, from Bickel, Hammel and O'Connell, "Sex Bias in
 * Graduate Admissions: Data from Berkeley", Science 187 (1975). Every number
 * on screen is computed from these counts.
 */
const COUNTS = {
  A: { men: [512, 313], women: [89, 19] },
  B: { men: [353, 207], women: [17, 8] },
  C: { men: [120, 205], women: [202, 391] },
  D: { men: [138, 279], women: [131, 244] },
  E: { men: [53, 138], women: [94, 299] },
  F: { men: [22, 351], women: [24, 317] },
} as const;

export type Group = "men" | "women";
export const GROUPS: Group[] = ["men", "women"];

export const DEPTS = (Object.keys(COUNTS) as (keyof typeof COUNTS)[]).map((dept) => {
  const tally = (g: Group) => {
    const [admitted, rejected] = COUNTS[dept][g];
    return { admitted, applied: admitted + rejected, rate: admitted / (admitted + rejected) };
  };
  const men = tally("men");
  const women = tally("women");
  return {
    dept,
    men,
    women,
    /** Both groups together: how hard the department is to get into. */
    rate: (men.admitted + women.admitted) / (men.applied + women.applied),
    /** Women's rate minus men's, in percentage points. */
    gap: (women.rate - men.rate) * 100,
  };
});
export type Dept = (typeof DEPTS)[number];

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pooled = (g: Group) => {
  const admitted = sum(DEPTS.map((d) => d[g].admitted));
  const applied = sum(DEPTS.map((d) => d[g].applied));
  return { admitted, applied, rate: admitted / applied };
};
export const TOTAL = { men: pooled("men"), women: pooled("women") };

/** Share of a group's applications that went to each department. */
export const share = (d: Dept, g: Group) => d[g].applied / TOTAL[g].applied;

/** The departments that admitted most applicants, and the rest. */
export const EASY = ["A", "B"];
const rateOf = (depts: Dept[]) =>
  sum(depts.map((d) => d.men.admitted + d.women.admitted)) / sum(depts.map((d) => d.men.applied + d.women.applied));
export const EASY_RATE = rateOf(DEPTS.filter((d) => EASY.includes(d.dept)));
export const HARD_RATE = rateOf(DEPTS.filter((d) => !EASY.includes(d.dept)));
export const EASY_SHARE = {
  men: sum(DEPTS.filter((d) => EASY.includes(d.dept)).map((d) => share(d, "men"))),
  women: sum(DEPTS.filter((d) => EASY.includes(d.dept)).map((d) => share(d, "women"))),
};

/** Women's own department rates, averaged over the men's application mix. */
export const WOMEN_AT_MEN_MIX = sum(DEPTS.map((d) => share(d, "men") * d.women.rate));

/** Two series, told apart by hue: blue and orange, neither of them the
 *  page's red accent. The ink steps are for text. */
export const COLOR = { men: ds("blue", 500), women: ds("orange", 500) } as const;
export const COLOR_INK = { men: BLUE_INK, women: inkOf.orange } as const;
export const NAME = { men: "Men", women: "Women" } as const;

/** "44.5%" */
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
