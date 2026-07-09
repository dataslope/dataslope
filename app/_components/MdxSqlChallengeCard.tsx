"use client";

/**
 * MDX-friendly wrapper around `<SqlChallengeCard>`.
 *
 * The wrapped component already accepts a string `dialect` prop, so
 * there's no adapter resolution to perform here, but keeping the
 * wrapper as a separate module mirrors the `MdxChallengeCard` /
 * `MdxCodeBlock` pattern and gives us a single import surface to
 * register with Fumadocs.
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
