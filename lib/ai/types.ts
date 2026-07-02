// Shared types for the "Ask AI" feature. Imported by both the server route
// (app/api/ai/chat) and the client widget (app/_components/ai), so keep this
// free of any server- or browser-only imports.

/** Membership tier that selects the model + quotas for a request. */
export type MemberTier = "free" | "pro";

/** Which surface the question was asked from. */
export type AskAiSurface = "learn" | "playground";

/** A single attached file's live contents (a code-block file or playground tab). */
export interface AskAiFile {
  filename: string;
  content: string;
}

/**
 * Client-collected context that travels with a question. Every string here is
 * treated by the server as untrusted DATA (never instructions) — the system
 * prompt says so explicitly. All fields are optional and bounded; the server
 * re-packs everything against a per-tier token budget.
 */
export interface AskAiClientContext {
  surface: AskAiSurface;
  /**
   * Learn only: lesson slug segments, e.g. ["python-basics", "loops"]. The
   * server resolves the lesson markdown itself from this (fetching the
   * prerendered `.md` asset) and never trusts client-supplied page text.
   */
  slug?: string[];
  /** Language / SQL-dialect id, e.g. "python", "duckdb". */
  adapterId?: string;
  /** Open / active files the user is looking at. */
  files?: AskAiFile[];
  /** Recent program output / errors, oldest → newest. */
  outputs?: string[];
  /** Freeform label of the focused widget, e.g. "Challenge: reverse a list". */
  focus?: string;
}

/** One prior conversation turn (capped client-side before sending). */
export interface AskAiTurn {
  role: "user" | "assistant";
  content: string;
}

/** POST body for `/api/ai/chat`. */
export interface AskAiRequest {
  question: string;
  context: AskAiClientContext;
  history?: AskAiTurn[];
}

/** OpenAI-style chat message (server-internal, but shaped here for reuse). */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * POST body for `/api/ai/complete` — AI inline autocomplete (pro-only).
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
 * Response body for `GET /api/ai/complete` — the capability probe the editor
 * extension uses to decide whether to request completions at all. `enabled`
 * is only true for signed-in pro members with a configured provider; the POST
 * handler re-checks server-side regardless.
 */
export interface AiCompleteAccess {
  enabled: boolean;
}

/**
 * Server → client Server-Sent-Event payloads. One JSON object per `data:`
 * line. `delta` streams answer text; `done` closes with the tier/model that
 * actually served the request; `error` reports a mid-stream failure.
 */
export type AskAiStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; tier: MemberTier; model: string }
  | { type: "error"; message: string };
