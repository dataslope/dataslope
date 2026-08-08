/**
 * Types for the generated creation-date map (`lib/generated/created-at.js`,
 * produced by `scripts/build-created-at.mjs` from this repository's git
 * history).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck and lint green on a fresh checkout before the build script has run
 * (same approach as `charts.d.ts` and `images.d.ts`).
 *
 * Both maps are keyed by the id the corresponding admin gallery already uses,
 * and both are *partial*: an artefact that has never been committed, or a
 * clone with no history to read, simply has no entry. Consumers should treat a
 * missing key as "unknown" rather than as an error, which is why the value
 * type is optional.
 */
export interface CreatedAtMap {
  /** Chart slug (`charts/<slug>.mjs`) → ISO-8601 UTC of the commit that added
   *  the spec. */
  charts: Record<string, string | undefined>;
  /** Illustration prompt id → ISO-8601 UTC of the commit that added its
   *  background-removed WebP, which is the file the site serves. */
  illustrations: Record<string, string | undefined>;
}

declare const createdAt: CreatedAtMap;

export default createdAt;
