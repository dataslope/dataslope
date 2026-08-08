/**
 * Turning a user's search box input into an FTS5 `MATCH` expression.
 *
 * FTS5's query language is not a subset of "whatever the user typed". It has
 * operators (`AND`, `OR`, `NOT`, `NEAR`), column filters (`col : term`), phrase
 * quoting, and prefix stars, and it *throws* on anything it cannot parse rather
 * than degrading. Passing raw input through is therefore both a correctness bug
 * and an injection surface.
 *
 * The correctness half bites immediately and on ordinary queries, not exotic
 * ones. Typing `pre-attentive` makes FTS5 read the hyphen as a column
 * separator, so it looks for a column named `attentive`, does not find one, and
 * the request 500s. Verified against the real corpus before this existed.
 *
 * So the input is reduced to bare word tokens and each is re-quoted. Quoting
 * makes every token a literal phrase, which means no user string can ever
 * become an operator: `x" OR docs MATCH "y` comes out as four quoted words that
 * match nothing, rather than as a second MATCH clause.
 *
 * The last token gets a prefix star so the results keep up with typing: someone
 * three letters into "quantile" should already be seeing quantile pages. Only
 * the last one, because prefix-matching every token makes short queries match
 * far too much.
 */

/** Word characters in any script, so accented and non-Latin terms survive. */
const TOKEN = /[\p{L}\p{N}_]+/gu;

/**
 * Words dropped before the tokens are AND-ed together.
 *
 * Not a size optimisation. Because every token becomes an `AND` clause, a
 * natural-language query is only as good as its weakest word: asking "why is a
 * truncated axis misleading" made `is` and `a` carry the same structural weight
 * as `truncated`, and the top hit became a page that happened to repeat "is"
 * near "why" rather than the page about truncated axes. Removing them lets the
 * terms that carry the question decide the ranking.
 *
 * Deliberately short. An aggressive list starts eating words that matter in a
 * programming context, where "not", "in", "is" and "as" are all operators or
 * keywords somewhere.
 */
const STOP = new Set([
  "a", "an", "and", "are", "at", "be", "but", "by", "do", "does", "for", "from",
  "how", "i", "if", "it", "its", "of", "on", "or", "that", "the", "their",
  "there", "they", "this", "to", "was", "what", "when", "where", "which",
  "who", "why", "with", "you", "your",
]);

/**
 * Build an FTS5 `MATCH` expression, or `null` when the input has no searchable
 * tokens at all (empty, whitespace, pure punctuation). Callers should treat
 * `null` as "return no results" rather than as an error: it is what a user gets
 * for typing `***`, and that is not a failure worth reporting.
 */
export function toMatchQuery(raw: string): string | null {
  const tokens = raw.toLowerCase().match(TOKEN);
  if (!tokens || tokens.length === 0) return null;

  // Keep the stop words when they are *all* there is, so searching "how to" or
  // "why" still looks for those words rather than silently returning nothing.
  const meaningful = tokens.filter((t) => !STOP.has(t));
  const kept = meaningful.length > 0 ? meaningful : tokens;

  // A very long query is not more useful than its first several terms, and
  // every extra AND clause costs a scan.
  const capped = kept.slice(0, 12);

  return capped
    .map((token, i) => (i === capped.length - 1 ? `"${token}"*` : `"${token}"`))
    .join(" AND ");
}
