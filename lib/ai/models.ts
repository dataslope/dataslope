// Per-tier provider + model resolution for AI autocomplete.
//
// Base URL, model id, and API key are all required per tier, there are no
// hardcoded fallbacks, so the actual provider/model lives entirely in env
// (wrangler.jsonc `vars` for the base URL + model id, `wrangler secret put`
// for the API key) and can change without touching this file. A tier missing
// any of the three is treated as unconfigured (see resolveModel below).
//
// Both providers must speak the OpenAI `/chat/completions` API, so the same
// adapter (lib/ai/provider.ts) drives whichever ones are configured.
import type { MemberTier } from "./types";

export interface ResolvedModel {
  /** OpenAI-compatible base URL, e.g. https://openrouter.ai/api/v1. */
  baseUrl: string;
  /** Provider API key (a secret). */
  apiKey: string;
  /** Model id, e.g. "deepseek/deepseek-v4-flash" (OpenRouter). */
  model: string;
}

/** Build a tier's provider config from env, or null if key/base URL/model isn't all set. */
function tierConfig(tier: MemberTier, env: CloudflareEnv): ResolvedModel | null {
  if (tier === "pro") {
    if (!env.AI_PRO_API_KEY || !env.AI_PRO_BASE_URL || !env.AI_PRO_MODEL) {
      return null;
    }
    return {
      apiKey: env.AI_PRO_API_KEY,
      baseUrl: env.AI_PRO_BASE_URL,
      model: env.AI_PRO_MODEL,
    };
  }
  if (!env.AI_FREE_API_KEY || !env.AI_FREE_BASE_URL || !env.AI_FREE_MODEL) {
    return null;
  }
  return {
    apiKey: env.AI_FREE_API_KEY,
    baseUrl: env.AI_FREE_BASE_URL,
    model: env.AI_FREE_MODEL,
  };
}

/**
 * Resolve the provider for `tier`. Fallback is asymmetric, by cost: a
 * half-configured pro tier degrades to the FREE provider, while a free tier
 * never silently upgrades to the pro provider, which would be a cost
 * fail-open on misconfiguration. Returns null when the tier can't be served →
 * the caller should 503.
 */
export function resolveModel(
  tier: MemberTier,
  env: CloudflareEnv,
): ResolvedModel | null {
  const primary = tierConfig(tier, env);
  if (primary) return primary;
  if (tier !== "pro") return null;
  return tierConfig("free", env);
}
