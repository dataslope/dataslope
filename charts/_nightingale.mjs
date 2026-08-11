/**
 * Florence Nightingale's Crimean mortality table, 1854-1856.
 *
 * Twenty-four months of the British army in the East: the average strength
 * present, the deaths in each of her three categories, and the annual rate per
 * 1,000 those deaths imply. These are the numbers behind the "Diagram of the
 * Causes of Mortality in the Army in the East" that she published in 1858, as
 * they are conventionally tabulated (the same table `HistData::Nightingale`
 * ships in R).
 *
 * Her three categories, in her own words:
 *
 *   • *Zymotic diseases*, the Victorian term for what we would call infectious
 *     and preventable: cholera, typhus, dysentery. Contracted in the hospital.
 *   • *Wounds and injuries*, which is what the public in London believed was
 *     killing the army.
 *   • *All other causes.*
 *
 * The rates rather than the counts are what her diagram draws, and the
 * distinction matters: the army grew from 8,571 men to 46,140 over the period,
 * so a chart of raw deaths would confound the epidemic with the size of the
 * force sent to fight it. Rates are how a nurse with no statistical training
 * anticipated the single most common error in public-health charts.
 *
 * Shared by `nightingale-rose-1858`, `nightingale-bars-1858` and
 * `nightingale-mortality-fell`, so the three cannot quote different numbers.
 */

/** month, army strength, and deaths from zymotic disease / wounds / other. */
const TABLE = [
  ["1854-04", 8571, 1, 0, 5],
  ["1854-05", 23333, 12, 0, 9],
  ["1854-06", 28333, 11, 0, 6],
  ["1854-07", 28722, 359, 0, 23],
  ["1854-08", 30246, 828, 1, 30],
  ["1854-09", 30290, 788, 81, 70],
  ["1854-10", 30643, 503, 132, 128],
  ["1854-11", 29736, 844, 287, 106],
  ["1854-12", 32779, 1725, 114, 131],
  ["1855-01", 32393, 2761, 83, 324],
  ["1855-02", 30919, 2120, 42, 361],
  ["1855-03", 30107, 1205, 32, 172],
  ["1855-04", 32252, 477, 48, 57],
  ["1855-05", 35473, 508, 49, 37],
  ["1855-06", 38863, 802, 209, 31],
  ["1855-07", 42647, 382, 134, 33],
  ["1855-08", 44614, 483, 164, 25],
  ["1855-09", 47751, 189, 276, 20],
  ["1855-10", 46852, 128, 53, 18],
  ["1855-11", 37853, 178, 33, 32],
  ["1855-12", 43217, 91, 18, 28],
  ["1856-01", 44212, 42, 2, 48],
  ["1856-02", 43485, 24, 0, 19],
  ["1856-03", 46140, 15, 0, 35],
];

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Annual rate per 1,000, which is what the diagram encodes: deaths in the
 *  month, scaled to a year, over the strength present. */
const rate = (deaths, army) => (deaths * 12 * 1000) / army;

export const MONTHS = TABLE.map(([ym, army, disease, wounds, other], i) => {
  const [year, month] = ym.split("-").map(Number);
  return {
    i,
    ym,
    year,
    month,
    label: `${MONTH_NAMES[month - 1]} ${year}`,
    short: MONTH_NAMES[month - 1],
    army,
    deaths: { disease, wounds, other },
    disease: rate(disease, army),
    wounds: rate(wounds, army),
    other: rate(other, army),
    total: rate(disease + wounds + other, army),
    // Her diagram is two roses, one per year of the war, each running April to
    // March. The commission arrived during the second month of the second one.
    period: i < 12 ? "April 1854 to March 1855" : "April 1855 to March 1856",
  };
});

export const PERIODS = ["April 1854 to March 1855", "April 1855 to March 1856"];

/** The three causes in her own color order: blue for preventable disease, red
 *  for wounds, black (here the muted neutral) for everything else. */
export const CAUSES = [
  { key: "disease", label: "Preventable disease" },
  { key: "wounds", label: "Wounds" },
  { key: "other", label: "All other causes" },
];

/** The Sanitary Commission reached Scutari in March 1855 and finished its work
 *  through the spring. The index is the first month after it arrived. */
export const COMMISSION_INDEX = MONTHS.findIndex((m) => m.ym === "1855-03");

export const PEAK = MONTHS.reduce((a, b) => (b.disease > a.disease ? b : a));
