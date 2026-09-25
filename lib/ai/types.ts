// Shared AI types. Imported by both the server route (app/api/ai/complete)
// and the client editor extension (app/_components/ai), so keep this free of
// any server- or browser-only imports.

/** Membership tier: gates AI autocomplete and selects storage quotas. */
export type MemberTier = "free" | "pro";

/** OpenAI-style chat message (server-internal, but shaped here for reuse). */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * POST body for `/api/ai/complete`, AI inline autocomplete (pro-only).
 * `prefix`/`suffix` are the document text before/after the cursor; both are
 * re-truncated server-side, so the client doesn't have to be exact. All
 * strings are treated as untrusted DATA, never instructions.
 */
export interface AiCompleteRequest {
  /** Language adapter id, e.g. "python", "typescript". */
  language: string;
  /** Document text before the cursor (may include read-only init code). */
  prefix: string;
  /** Document text after the cursor. */
  suffix: string;
  /** Active filename, when the surface has one (multi-file workspaces). */
  filename?: string;
}

/** Response body for `POST /api/ai/complete`. Empty text = no suggestion. */
export interface AiCompleteResponse {
  text: string;
}

/**
 * Response body for `GET /api/ai/complete`, the capability probe the editor
 * extension uses to decide whether to request completions at all. `enabled`
 * is only true for signed-in pro members with a configured provider; the POST
 * handler re-checks server-side regardless.
 */
export interface AiCompleteAccess {
  enabled: boolean;
}
