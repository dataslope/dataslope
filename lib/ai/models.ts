// Per-tier model + provider resolution for "Ask AI".
//
// Base URL, model id, and API key are all required per tier — there are no
// hardcoded fallbacks, so the actual provider/model lives entirely in env
// (wrangler.jsonc `vars` for the base URL + model id, `wrangler secret put`
// for the API key) and can change without touching this file. A tier missing
// any of the three is treated as unconfigured (see resolveModel below).
//
// Both providers must speak the OpenAI `/chat/completions` streaming API, so
// the same adapter (lib/ai/provider.ts) drives whichever ones are configured.
import type { MemberTier } from "./types";

export interface ResolvedModel {
  /** The requesting member's tier (what to report back + which budgets apply). */
  tier: MemberTier;
  /** OpenAI-compatible base URL, e.g. https://openrouter.ai/api/v1. */
  baseUrl: string;
  /** Provider API key (a secret). */
  apiKey: string;
  /** Model id, e.g. "deepseek/deepseek-v4-flash" (OpenRouter). */
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

type TierLimits = Pick<
  ResolvedModel,
  "maxTokens" | "dailyTokenBudget" | "dailyRequestBudget" | "contextBudget"
>;

/** Non-secret per-tier limits. Provider/model have no defaults — see wrangler.jsonc. */
const LIMITS: Record<MemberTier, TierLimits> = {
  free: {
    maxTokens: 800,
    dailyTokenBudget: 60_000,
    dailyRequestBudget: 40,
    contextBudget: 8_000,
  },
  pro: {
    maxTokens: 1_200,
    dailyTokenBudget: 400_000,
    dailyRequestBudget: 400,
    contextBudget: 12_000,
  },
};

/** Build a tier's provider config from env, or null if key/base URL/model isn't all set. */
function tierConfig(tier: MemberTier, env: CloudflareEnv): ResolvedModel | null {
  if (tier === "pro") {
    if (!env.AI_PRO_API_KEY || !env.AI_PRO_BASE_URL || !env.AI_PRO_MODEL) {
      return null;
    }
    return {
      ...LIMITS.pro,
      tier,
      apiKey: env.AI_PRO_API_KEY,
      baseUrl: env.AI_PRO_BASE_URL,
      model: env.AI_PRO_MODEL,
    };
  }
  if (!env.AI_FREE_API_KEY || !env.AI_FREE_BASE_URL || !env.AI_FREE_MODEL) {
    return null;
  }
  return {
    ...LIMITS.free,
    tier,
    apiKey: env.AI_FREE_API_KEY,
    baseUrl: env.AI_FREE_BASE_URL,
    model: env.AI_FREE_MODEL,
  };
}

/**
 * Resolve the model to use for `tier`. If that tier's provider isn't fully
 * configured (key, base URL, and model all set), degrade to whichever tier
 * *is* configured (so a half-wired environment still answers) while keeping
 * the requesting tier's budgets and output cap. Returns null only when
 * NEITHER tier is configured → the caller should 503 ("assistant isn't
 * configured yet").
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
  return {
    ...fallback,
    tier,
    ...LIMITS[tier],
  };
}
