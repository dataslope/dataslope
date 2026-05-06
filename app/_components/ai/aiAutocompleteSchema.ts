/**
 * JSON Schema definition for AI autocomplete structured responses.
 *
 * Bump AUTOCOMPLETE_SCHEMA_VERSION whenever the schema definition changes.
 * The cache layer keys on this version so stale cached responses are
 * automatically invalidated when the schema evolves.
 */

/** Increment when the schema definition below changes. */
export const AUTOCOMPLETE_SCHEMA_VERSION = "1";

export type CompletionItemType =
  | "keyword"
  | "function"
  | "type"
  | "property"
  | "variable"
  | "namespace"
  | "text";

export interface AutocompleteSuggestion {
  /** Display label shown in the completion popup. */
  label: string;
  /**
   * Text inserted when the user accepts this suggestion.
   * Defaults to `label` when omitted.
   */
  apply?: string | null;
  /** Short description shown to the right of the label. */
  detail?: string | null;
  /** CodeMirror completion type — controls the icon in the popup. */
  type: CompletionItemType;
}

export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

/**
 * OpenAI-compatible `response_format` value that requests structured JSON
 * output conforming to {@link AutocompleteResponse}.
 */
export const AUTOCOMPLETE_RESPONSE_FORMAT = {
  type: "json_schema" as const,
  json_schema: {
    name: "autocomplete_suggestions",
    strict: true,
    schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              apply: { type: ["string", "null"] },
              detail: { type: ["string", "null"] },
              type: {
                type: "string",
                enum: [
                  "keyword",
                  "function",
                  "type",
                  "property",
                  "variable",
                  "namespace",
                  "text",
                ] as CompletionItemType[],
              },
            },
            required: ["label", "apply", "detail", "type"],
            additionalProperties: false,
          },
        },
      },
      required: ["suggestions"],
      additionalProperties: false,
    },
  },
};

/** Runtime guard: verify that a parsed API response is an AutocompleteResponse. */
export function isAutocompleteResponse(
  value: unknown,
): value is AutocompleteResponse {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.suggestions)) return false;
  return obj.suggestions.every(
    (s: unknown) =>
      typeof s === "object" &&
      s !== null &&
      typeof (s as Record<string, unknown>).label === "string" &&
      typeof (s as Record<string, unknown>).type === "string" &&
      (!("apply" in (s as Record<string, unknown>)) ||
        typeof (s as Record<string, unknown>).apply === "string" ||
        (s as Record<string, unknown>).apply === null) &&
      (!("detail" in (s as Record<string, unknown>)) ||
        typeof (s as Record<string, unknown>).detail === "string" ||
        (s as Record<string, unknown>).detail === null),
  );
}
