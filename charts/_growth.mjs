/**
 * Two series with very different sizes and very different growth rates, shared
 * by `log-scale-percent-change` and its log-axis sibling.
 *
 * The point of the pair is that the *faster-growing* series is the smaller one,
 * which a linear axis cannot show and a log axis makes obvious. Both rates live
 * here so neither chart can quote a number the other contradicts.
 */
import { ACCENT, PRIMARY } from "./_theme.mjs";

export const PERIODS = 12;

export const SERIES_DEF = [
  { key: "Established", start: 4000, growth: 0.06, color: PRIMARY },
  { key: "New", start: 40, growth: 0.35, color: ACCENT },
];

export const rows = SERIES_DEF.flatMap((s) =>
  Array.from({ length: PERIODS + 1 }, (_, t) => ({
    key: s.key,
    color: s.color,
    t,
    value: s.start * (1 + s.growth) ** t,
  })),
);

export const ends = SERIES_DEF.map((s) => ({
  key: s.key,
  color: s.color,
  value: s.start * (1 + s.growth) ** PERIODS,
}));

export const SMALL = SERIES_DEF[1];
export const BIG = SERIES_DEF[0];
