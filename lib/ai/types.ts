// Shared types for the "Ask AI" feature. Imported by both the server route
// (app/api/ai/chat) and the client widget (app/_components/ai), so keep this
// free of any server- or browser-only imports.

/** Membership tier that selects the model + quotas for a request. */
export type MemberTier = "free" | "pro";

/** Which surface the question was asked from. */
export type AskAiSurface = "learn" | "playground";

/**
 * How long the assistant's answers should be. Set from the panel's Settings
 * ("Answer length") and remembered as a user preference; steers the system
 * prompt and the output-token cap. Defaults to "balanced".
 */
export type AskAiAnswerLength = "concise" | "balanced" | "detailed";

/** A single attached file's live contents (a code-block file or playground tab). */
export interface AskAiFile {
  filename: string;
  content: string;
}

/**
 * One on-page widget captured at send time. `content` is a packed plain-text
 * description of the widget's live state. The server treats every field as
 * untrusted DATA and re-clips against the token budget.
 */
export interface AskAiWidgetContext {
  /** Widget kind, e.g. "challenge", "code-block", "mcq", "sql-playground". */
  kind: string;
  /** Short human label, e.g. `Challenge: Reverse a list`. */
  label: string;
  /** Packed plain-text state of the widget. */
  content: string;
  /** True when the user explicitly attached this widget to the question
   *  (vs. it merely being visible on screen). */
  referenced?: boolean;
}

/**
 * Client-collected context that travels with a question. Every string here is
 * treated by the server as untrusted DATA (never instructions), the system
 * prompt says so explicitly. All fields are optional and bounded; the server
 * re-packs everything against a per-tier token budget.
 */
export interface AskAiClientContext {
  surface: AskAiSurface;
  /**
   * Learn surface only: full lesson path segments including the section base,
   * e.g. ["courses", "python-basics", "loops"]. The server allowlists the
   * base, resolves the lesson markdown itself, and never trusts
   * client-supplied page text.
   */
  slug?: string[];
  /**
   * Whether the server should fetch this lesson's full Markdown. Off by
   * default; the user opts in via the panel's context sheet. The server
   * hard-caps the text regardless. Ignored off the learn surface.
   */
  includeLessonText?: boolean;
  /**
   * The page's rendered heading. On by default (~15 tokens): `slug` never
   * reaches the prompt, so without this the model doesn't know which lesson
   * is on screen. The course name is resolved server-side from `slug`, not
   * taken from here.
   */
  page?: { title?: string };
  /** Language / SQL-dialect id, e.g. "python", "duckdb". */
  adapterId?: string;
  /** Open / active files the user is looking at. */
  files?: AskAiFile[];
  /** Recent program output / errors, oldest → newest. */
  outputs?: string[];
  /** Freeform label of the focused widget, e.g. "Challenge: reverse a list". */
  focus?: string;
  /** Text the user highlighted on the page when asking. */
  selection?: string;
  /** Label of the widget the selection came from, when it fell inside one. */
  selectionLabel?: string;
  /**
   * On-page widgets captured at send time: ones the user explicitly pinned
   * in the panel (`referenced: true`) first, then whatever is currently
   * visible in the viewport, most-visible first.
   */
  widgets?: AskAiWidgetContext[];
  /** SQL surfaces only: compact database-schema summary (tables/columns/FKs). */
  schema?: string;
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
  /** Preferred answer length (panel Settings). Defaults to "balanced". */
  answerLength?: AskAiAnswerLength;
}

/**
 * POST body for `/api/ai/suggest`, three suggested questions for the panel's
 * empty state and after each answer. Same context shape as chat; no question.
 * Tracked on suggestion-specific counters, so it never consumes the member's
 * Ask AI chat budget.
 */
export interface AskAiSuggestRequest {
  context: AskAiClientContext;
  /** Recent conversation turns, so post-answer suggestions are follow-ups. */
  history?: AskAiTurn[];
}

/** Response body for `POST /api/ai/suggest`. Empty array = nothing to show. */
export interface AskAiSuggestResponse {
  questions: string[];
}

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

/**
 * Server → client Server-Sent-Event payloads. One JSON object per `data:`
 * line. `delta` streams answer text; `done` closes with the tier/model that
 * actually served the request; `error` reports a mid-stream failure.
 */
export type AskAiStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; tier: MemberTier; model: string }
  | { type: "error"; message: string };

/**
 * Response body for `GET /api/ai/usage`, today's Ask AI chat quota for the
 * signed-in member, so the panel can show "N prompts left today".
 * `requestsRemaining` is clamped to ≥ 0.
 */
export interface AskAiUsageResponse {
  tier: MemberTier;
  requestsUsed: number;
  requestsLimit: number;
  requestsRemaining: number;
}
