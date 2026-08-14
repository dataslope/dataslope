"use client";

/**
 * MDX-friendly wrapper around `<SqlCodeBlock>`, mirroring the
 * `MdxSqlChallengeCard` / `MdxCodeBlock` pattern; renders a message for an
 * unknown `dialect` instead of crashing the page.
 */

import SqlCodeBlock, {
  type SqlCodeBlockProps,
  type SqlDialect,
} from "./SqlCodeBlock";

const VALID_DIALECTS: ReadonlySet<SqlDialect> = new Set([
  "sqlite",
  "duckdb",
  "postgres",
]);

export default function MdxSqlCodeBlock(props: SqlCodeBlockProps) {
  if (!VALID_DIALECTS.has(props.dialect)) {
    return (
      <div role="alert" style={{ color: "#ef4444", padding: "0.75rem" }}>
        Unknown SqlCodeBlock dialect: <code>{props.dialect}</code>.
        Expected one of: sqlite, duckdb, postgres.
      </div>
    );
  }
  return <SqlCodeBlock {...props} />;
}
