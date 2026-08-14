"use client";

/**
 * MDX-friendly wrapper around `<SqlChallengeCard>`, mirroring the
 * `MdxChallengeCard` / `MdxCodeBlock` pattern; guards against unknown
 * dialects.
 */

import SqlChallengeCard, {
  type SqlChallengeCardProps,
  type SqlDialect,
} from "./SqlChallengeCard";

const VALID_DIALECTS: ReadonlySet<SqlDialect> = new Set([
  "sqlite",
  "duckdb",
  "postgres",
]);

export default function MdxSqlChallengeCard(props: SqlChallengeCardProps) {
  if (!VALID_DIALECTS.has(props.dialect)) {
    return (
      <div role="alert" style={{ color: "#ef4444", padding: "0.75rem" }}>
        Unknown SqlChallengeCard dialect: <code>{props.dialect}</code>.
        Expected one of: sqlite, duckdb, postgres.
      </div>
    );
  }
  return <SqlChallengeCard {...props} />;
}
