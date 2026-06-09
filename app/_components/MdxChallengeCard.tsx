"use client";

/**
 * MDX-friendly wrapper around `<ChallengeCard>`.
 *
 * MDX content can't import TypeScript modules, so this component
 * accepts the adapter as a string id (e.g. `"python"`) and resolves it
 * to the corresponding adapter instance — mirroring `<MdxCodeBlock>`.
 *
 * Usage in MDX (instructions can be a markdown string or a JSX node;
 * every card passes a `files` array, each file carrying its own
 * `initCode`, `starterCode`, and optional `solutionCode`):
 * ```mdx
 * <ChallengeCard
 *   adapter="python"
 *   title="Summarize Sales by Category"
 *   instructions={`You have a DataFrame called \`df\` with sales data.
 *
 * Group by \`category\` and compute totals.`}
 *   files={[
 *     {
 *       filename: "main.py",
 *       initCode: `import pandas as pd\ndf = pd.DataFrame(...)`,
 *       starterCode: `summary = None`,
 *       solutionCode: `summary = df.groupby("category").sum()`,
 *     },
 *   ]}
 *   tests={[
 *     {
 *       id: "summary_exists",
 *       name: "`summary` exists",
 *       description: "A variable named `summary` is defined",
 *       code: `assert summary is not None`,
 *     },
 *   ]}
 * />
 * ```
 */

import ChallengeCard, { type ChallengeCardProps } from "./ChallengeCard";
import { getAdapterById, type AdapterId } from "./runtime/adapters";
import type { ChallengeTest } from "./challengeHarness";

interface MdxChallengeCardProps
  extends Omit<ChallengeCardProps, "adapter" | "tests"> {
  adapter: AdapterId;
  tests: ChallengeTest[];
}

export type { ChallengeFile } from "./ChallengeCard";

export default function MdxChallengeCard({
  adapter,
  ...rest
}: MdxChallengeCardProps) {
  const resolved = getAdapterById(adapter);
  if (!resolved) {
    return (
      <div role="alert" style={{ color: "#ef4444", padding: "0.75rem" }}>
        Unknown ChallengeCard adapter id: <code>{adapter}</code>
      </div>
    );
  }
  return <ChallengeCard adapter={resolved} {...rest} />;
}
