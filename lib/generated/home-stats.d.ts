/**
 * Type for the generated home-page corpus figures
 * (`lib/generated/home-stats.js`, produced by `scripts/build-home-stats.mjs`
 * by scanning the MDX corpus under `content/`).
 *
 * Committed even though the `.js` it describes is gitignored: it keeps
 * typecheck/lint green on a fresh checkout before the build script has run.
 *
 * Raw counts, not display values — `app/page.tsx` floors them to a round
 * number and appends "+". They exist so `/` can render without touching
 * `node:fs`, which workerd has no implementation for; see the script header.
 */
export interface GeneratedHomeStats {
  runnableCodeBlocks: number;
  codeChallenges: number;
  interviewRoles: number;
}

declare const homeStats: GeneratedHomeStats;

export default homeStats;
