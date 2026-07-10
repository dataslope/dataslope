/**
 * Display labels for custom-content kinds, shared by the viewer pages,
 * the Create hub, and the builders. Pure module.
 */

import type { CustomItemKind, CustomItemPayload } from "./types";

const ADAPTER_LABELS: Record<string, string> = {
  python: "Python",
  r: "R",
  javascript: "JavaScript",
  typescript: "TypeScript",
  php: "PHP",
  c: "C",
  cpp: "C++",
  java: "Java",
  csharp: "C#",
  web: "HTML/CSS/JS",
  react: "React",
};

const DIALECT_LABELS: Record<string, string> = {
  sqlite: "SQLite",
  duckdb: "DuckDB",
  postgres: "PostgreSQL",
};

export function adapterLabel(id: string): string {
  return ADAPTER_LABELS[id] ?? id;
}

export function sqlDialectLabel(id: string): string {
  return DIALECT_LABELS[id] ?? id;
}

/** "Python coding challenge" / "SQLite SQL challenge" / "multiple-choice
 *  question". Pass the payload when available for the language detail. */
export function customItemKindLabel(
  kind: CustomItemKind,
  payload?: CustomItemPayload,
): string {
  if (kind === "code") {
    const lang =
      payload?.kind === "code" ? `${adapterLabel(payload.adapter)} ` : "";
    return `${lang}coding challenge`;
  }
  if (kind === "sql") {
    const dialect =
      payload?.kind === "sql" ? `${sqlDialectLabel(payload.dialect)} ` : "";
    return `${dialect}SQL challenge`;
  }
  return "multiple-choice question";
}

/** Short chip label for lists ("Python", "SQL · DuckDB", "MCQ"). */
export function customItemShortLabel(
  kind: CustomItemKind,
  payload?: CustomItemPayload,
): string {
  if (kind === "code") {
    return payload?.kind === "code" ? adapterLabel(payload.adapter) : "Code";
  }
  if (kind === "sql") {
    return payload?.kind === "sql"
      ? `SQL · ${sqlDialectLabel(payload.dialect)}`
      : "SQL";
  }
  return "MCQ";
}
