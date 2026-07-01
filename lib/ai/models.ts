// Per-tier model + provider resolution for "Ask AI".
//
// The product decision: FREE members use a cheaper model from an
// OpenAI-compatible aggregator (OpenRouter by default), and PAID (pro) members
// use an OpenAI model. Each tier has its own base URL, API key, and model id,
// plus its own output cap and daily budgets. Everything is overridable by env
// so the actual provider/model is a config change, never a code change.
//
// Both providers speak the OpenAI `/chat/completions` streaming API, so the
// same adapter (lib/ai/provider.ts) drives either one.
import type { MemberTier } from "./types";

export interface ResolvedModel {
  /** The requesting member's tier (what to report back + which budgets apply). */
  tier: MemberTier;
  /** OpenAI-compatible base URL, e.g. https://openrouter.ai/api/v1. */
  baseUrl: string;
  /** Provider API key (a secret). */
  apiKey: string;
  /** Model id, e.g. "openai/gpt-4o-mini" (OpenRouter) or "gpt-4o" (OpenAI). */
  model: string;
  /** Max output tokens — the single biggest per-request cost lever. */
  maxTokens: number;
  /** Approx per-day token budget (input + output) for this tier. */
  dailyTokenBudget: number;
  /** Max Ask AI requests per day for this tier. */
  dailyRequestBudget: number;
  /** Approx input-context packing budget, in tokens. */
  contextBudget: number;
}

/** Non-secret defaults per tier. Only the API keys have no default. */
const DEFAULTS: Record<
  MemberTier,
  Omit<ResolvedModel, "tier" | "apiKey">
> = {
  free: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    maxTokens: 800,
    dailyTokenBudget: 60_000,
    dailyRequestBudget: 40,
    contextBudget: 8_000,
  },
  pro: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o",
    maxTokens: 1_200,
    dailyTokenBudget: 400_000,
    dailyRequestBudget: 400,
    contextBudget: 12_000,
  },
};

/** Build a tier's provider config from env, or null if its key is unset. */
function tierConfig(tier: MemberTier, env: CloudflareEnv): ResolvedModel | null {
  const d = DEFAULTS[tier];
  if (tier === "pro") {
    if (!env.AI_PRO_API_KEY) return null;
    return {
      ...d,
      tier,
      apiKey: env.AI_PRO_API_KEY,
      baseUrl: env.AI_PRO_BASE_URL || d.baseUrl,
      model: env.AI_PRO_MODEL || d.model,
    };
  }
  if (!env.AI_FREE_API_KEY) return null;
  return {
    ...d,
    tier,
    apiKey: env.AI_FREE_API_KEY,
    baseUrl: env.AI_FREE_BASE_URL || d.baseUrl,
    model: env.AI_FREE_MODEL || d.model,
  };
}

/**
 * Resolve the model to use for `tier`. If that tier's provider key isn't
 * configured, degrade to whichever provider *is* configured (so a half-wired
 * environment still answers) while keeping the requesting tier's budgets and
 * output caps. Returns null only when NO provider key is set at all → the
 * caller should 503 ("assistant isn't configured yet").
 */
export function resolveModel(
  tier: MemberTier,
  env: CloudflareEnv,
): ResolvedModel | null {
  const primary = tierConfig(tier, env);
  if (primary) return primary;

  const fallback = tierConfig(tier === "pro" ? "free" : "pro", env);
  if (!fallback) return null;

  // Use the available provider, but keep the requesting tier's limits.
  const d = DEFAULTS[tier];
  return {
    ...fallback,
    tier,
    maxTokens: d.maxTokens,
    dailyTokenBudget: d.dailyTokenBudget,
    dailyRequestBudget: d.dailyRequestBudget,
    contextBudget: d.contextBudget,
  };
}
