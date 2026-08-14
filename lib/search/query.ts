/**
 * Turning a user's search box input into an FTS5 `MATCH` expression. FTS5 has
 * operators, column filters, quoting, and prefix stars, and it *throws* on
 * anything it cannot parse, so raw input is both a correctness bug (typing
 * `pre-attentive` reads the hyphen as a column filter and 500s) and an
 * injection surface. Input is reduced to bare word tokens, each re-quoted as
 * a literal phrase, so no user string can become an operator (`x" OR docs
 * MATCH "y` becomes four quoted words). Only the last token gets a prefix
 * star, so results keep up with typing without short queries over-matching.
 */

/** Word characters in any script, so accented and non-Latin terms survive. */
const TOKEN = /[\p{L}\p{N}_]+/gu;

/**
 * Words dropped before the tokens are AND-ed. Not a size optimisation: every
 * token becomes an AND clause, so `is`/`a` would carry the same structural
 * weight as the terms that carry the question. Deliberately short — an
 * aggressive list eats words that matter in a programming context ("not",
 * "in", "is", "as").
 */
const STOP = new Set([
  "a", "an", "and", "are", "at", "be", "but", "by", "do", "does", "for", "from",
  "how", "i", "if", "it", "its", "of", "on", "or", "that", "the", "their",
  "there", "they", "this", "to", "was", "what", "when", "where", "which",
  "who", "why", "with", "you", "your",
]);

/**
 * The tokens a query actually searches for: lowercased word tokens, stop words
 * dropped (unless they are all there is), capped at 12. This is the list the
 * MATCH expression is built from, and it is also what result URLs carry in
 * their `hl` parameter so the landing page can highlight the matched words.
 */
export function searchTokens(raw: string): string[] {
  const tokens = raw.toLowerCase().match(TOKEN);
  if (!tokens || tokens.length === 0) return [];

  // Keep the stop words when they are *all* there is, so searching "how to" or
  // "why" still looks for those words rather than silently returning nothing.
  const meaningful = tokens.filter((t) => !STOP.has(t));
  const kept = meaningful.length > 0 ? meaningful : tokens;

  // A very long query is not more useful than its first several terms, and
  // every extra AND clause costs a scan.
  return kept.slice(0, 12);
}

/**
 * Build an FTS5 `MATCH` expression, or `null` when the input has no searchable
 * tokens at all (empty, whitespace, pure punctuation). Callers should treat
 * `null` as "return no results" rather than as an error: it is what a user gets
 * for typing `***`, and that is not a failure worth reporting.
 */
export function toMatchQuery(raw: string): string | null {
  const capped = searchTokens(raw);
  if (capped.length === 0) return null;

  return capped
    .map((token, i) => (i === capped.length - 1 ? `"${token}"*` : `"${token}"`))
    .join(" AND ");
}
