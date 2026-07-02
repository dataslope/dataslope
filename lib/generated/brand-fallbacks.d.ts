/**
 * Type for the generated brand-token fallback map
 * (`lib/generated/brand-fallbacks.js`, produced by
 * `scripts/build-brand-fallbacks.mjs` from app/brand.css — the single source
 * of truth for the `--ds-*` color ramps).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run.
 * Keys are `--ds-*` custom-property names, values are concrete hex colors
 * (`"--ds-blue-500": "#148CFF"`); alias tokens that reference other tokens
 * via var() are not included.
 */
declare const brandFallbacks: Record<string, string>;

export default brandFallbacks;
