"use client";

/**
 * MDX-friendly wrapper around `<ChallengeCard>`. MDX content can't import
 * TypeScript modules, so this accepts the adapter as a string id (e.g.
 * `"python"`) and resolves it to the adapter instance, mirroring
 * `<MdxCodeBlock>`.
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
