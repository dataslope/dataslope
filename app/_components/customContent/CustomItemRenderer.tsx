"use client";

/**
 * Renders one stored custom item (code challenge, SQL challenge, or MCQ)
 * with the SAME interactive components the authored courses use, the
 * stored payload is just those components' props (see
 * lib/custom-content/types.ts). Used by the public /c/<id> and /quiz/<id>
 * pages and by the builders' preview panes.
 */

import MdxChallengeCard from "../MdxChallengeCard";
import MdxSqlChallengeCard from "../MdxSqlChallengeCard";
import MultipleChoiceQuestion from "../multipleChoice/MultipleChoiceQuestion";
import type { ChallengeTest } from "../challengeHarness";
import type {
  CodeChallengePayload,
  CustomItemPayload,
} from "@/lib/custom-content/types";

/** Narrow the storage shape (both keys optional) into the component's
 *  union (exactly one present, enforced at save time by schema.ts). */
function toChallengeTests(payload: CodeChallengePayload): ChallengeTest[] {
  return payload.tests.map((t) => {
    const base = {
      id: t.id,
      name: t.name,
      ...(t.description ? { description: t.description } : {}),
    };
    return t.code !== undefined
      ? { ...base, code: t.code }
      : { ...base, expect: t.expect ?? {} };
  });
}

export interface CustomItemRendererProps {
  title: string;
  payload: CustomItemPayload;
  /** Badge label on the card header (e.g. "Challenge", "Question 2"). */
  badge?: string;
}

export default function CustomItemRenderer({
  title,
  payload,
  badge,
}: CustomItemRendererProps) {
  if (payload.kind === "code") {
    return (
      <MdxChallengeCard
        adapter={payload.adapter}
        title={title}
        badge={badge}
        instructions={payload.instructions}
        files={payload.files}
        entryFilename={payload.entryFilename}
        tests={toChallengeTests(payload)}
        packages={payload.packages}
      />
    );
  }
  if (payload.kind === "sql") {
    return (
      <MdxSqlChallengeCard
        dialect={payload.dialect}
        title={title}
        badge={badge}
        instructions={payload.instructions}
        initSql={payload.initSql}
        starterCode={payload.starterCode}
        solutionSql={payload.solutionSql}
        tests={payload.tests}
      />
    );
  }
  return <MultipleChoiceQuestion markdown={payload.markdown} badge={badge} />;
}
