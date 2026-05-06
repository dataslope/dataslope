/**
 * SQL-specific AI completion source.
 *
 * Wraps the language-agnostic {@link createAiCompletionSource} with a prompt
 * builder that embeds the current SQL query context and database schema, then
 * returns a CodeMirror CompletionSource ready to drop into an `autocompletion`
 * extension.
 */

import type { CompletionContext, CompletionSource } from "@codemirror/autocomplete";
import {
  createAiCompletionSource,
  type AiCompletionSourceOptions,
} from "../ai/aiCompletionSource";
import type { SqlCompletionSchema } from "./sqlCompletion";

const SQL_SYSTEM_PROMPT =
  "You are a SQL autocomplete engine. " +
  "Given a partial SQL query where [CURSOR] marks the insertion point, " +
  "return up to 8 relevant completions for what should appear at [CURSOR]. " +
  "Prefer column names and table names that appear in the provided schema. " +
  "Avoid duplicates. Return completions most relevant to the current clause " +
  "(e.g. column names after SELECT/WHERE, table names after FROM/JOIN).";

/**
 * Build a user-turn prompt from the CodeMirror context and the live schema.
 *
 * Returns `null` when the cursor is inside a string literal (single-quoted),
 * which skips the AI call and allows the fallback source to run instead.
 */
function buildSqlPrompt(
  context: CompletionContext,
  schema: SqlCompletionSchema,
): {
  userPrompt: string;
  cacheKey: string;
  from: number;
} | null {
  const doc = context.state.doc.toString();
  const pos = context.pos;

  // Skip if cursor is inside a single-quoted string (heuristic).
  const before = doc.slice(0, pos);
  const singleQuoteCount = (before.match(/'/g) ?? []).length;
  if (singleQuoteCount % 2 !== 0) return null;

  const word = context.matchBefore(/[A-Za-z_][A-Za-z0-9_$]*/);
  const from = word?.from ?? pos;

  // Keep the context window small for low latency: 500 chars before + 100 after.
  const contextBefore = doc.slice(Math.max(0, pos - 500), pos);
  const contextAfter = doc.slice(pos, Math.min(doc.length, pos + 100));
  const markedQuery = contextBefore + "[CURSOR]" + contextAfter;

  const schemaDesc = schema.entities
    .map((e) => `${e.kind} ${e.name}(${e.columns.join(", ")})`)
    .join("\n");

  const userPrompt = schemaDesc
    ? `Schema:\n${schemaDesc}\n\nQuery:\n${markedQuery}`
    : `Query:\n${markedQuery}`;

  // Derive a stable cache key from the schema fingerprint + marked query.
  const schemaFingerprint = schema.entities
    .map((e) => `${e.name}:${e.columns.join(",")}`)
    .join("|");
  const cacheSource = `${schemaFingerprint}|${markedQuery}`;

  // djb2-style 32-bit hash — fast, good distribution for short strings.
  let hash = 5381;
  for (let i = 0; i < cacheSource.length; i++) {
    hash = (Math.imul(hash, 33) ^ cacheSource.charCodeAt(i)) | 0;
  }
  const cacheKey = `sql:${hash >>> 0}`;

  return { userPrompt, cacheKey, from };
}

export interface SqlAiCompletionOptions
  extends Omit<AiCompletionSourceOptions, "buildPrompt" | "systemPrompt"> {
  /** Current database schema used to build context-rich prompts. */
  schema: SqlCompletionSchema;
}

/**
 * Create a SQL-aware AI CompletionSource.
 *
 * Includes the live database schema in every prompt so the model can suggest
 * real table and column names.  Falls back to `fallback` on any error or when
 * the cursor is inside a context where AI suggestions are not appropriate.
 *
 * @param options  - AI provider config + current schema.
 * @param fallback - Non-AI source to use when AI is unavailable or fails.
 */
export function createSqlAiCompletionSource(
  options: SqlAiCompletionOptions,
  fallback?: CompletionSource,
): CompletionSource {
  return createAiCompletionSource({
    ...options,
    systemPrompt: SQL_SYSTEM_PROMPT,
    buildPrompt: (context: CompletionContext) =>
      buildSqlPrompt(context, options.schema),
    fallback,
  });
}
