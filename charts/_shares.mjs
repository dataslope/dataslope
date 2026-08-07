/**
 * The six traffic shares that `share-stacked` and `share-sorted` both draw.
 *
 * Shared rather than duplicated because the pair's entire argument is that
 * these are *the same numbers*: if the two charts could drift apart, the
 * comparison would be a claim rather than a demonstration. Two middle
 * categories sit within a point of each other on purpose, since ranking them
 * is easy in one chart and genuinely hard in the other.
 */
import { SERIES } from "./_theme.mjs";

export const SHARES = [
  { key: "Direct", share: 0.27 },
  { key: "Search", share: 0.23 },
  { key: "Social", share: 0.185 },
  { key: "Email", share: 0.178 },
  { key: "Referral", share: 0.088 },
  { key: "Other", share: 0.049 },
];

/** One colour per category, stable across both charts so a reader can carry a
 *  category from one to the other. */
export const SHARE_COLOR = Object.fromEntries(
  SHARES.map((s, i) => [s.key, SERIES[i % SERIES.length]]),
);

/** The two categories the pair is really about: nearest neighbours by share. */
export const CLOSEST = [...SHARES]
  .map((s, i, all) => ({ s, next: all[i + 1] }))
  .filter((p) => p.next)
  .reduce((a, b) => (Math.abs(b.s.share - b.next.share) < Math.abs(a.s.share - a.next.share) ? b : a));
