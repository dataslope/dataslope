/**
 * Limits + retention policy for custom content (challenges, MCQs, quiz
 * sets), mirroring lib/workspaces/policy.ts.
 *
 * Slugs reuse the playground-share format (16-char crypto-random, see
 * newShareId), so /c/<id> and /quiz/<id> links are unguessable the same way
 * /s/<id> links are.
 *
 * Retention: member rows never expire (they're small D1 text rows, not R2
 * bundles, so there is no storage pressure that justifies an inactivity
 * sweep); guest rows carry a fixed ~30-day `expires_at` minted at creation.
 * Expiry is evaluated at read time and enforced lazily by the routes, the
 * same no-cron design as playground shares.
 *
 * Pure module: no D1 access, unit-tested in __tests__/customContent.test.ts.
 */

import type { MemberTier } from "@/lib/ai/types";

export {
  isValidShareId as isValidCustomId,
  newShareId as newCustomId,
} from "@/lib/workspaces/policy";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CustomContentLimits {
  maxItems: number;
  maxSets: number;
}

export const FREE_CUSTOM_LIMITS: CustomContentLimits = {
  maxItems: 100,
  maxSets: 25,
};

export const PRO_CUSTOM_LIMITS: CustomContentLimits = {
  maxItems: 1000,
  maxSets: 250,
};

export function customLimitsForTier(tier: MemberTier): CustomContentLimits {
  return tier === "pro" ? PRO_CUSTOM_LIMITS : FREE_CUSTOM_LIMITS;
}

/** Guest creations: fixed row lifetime + daily creation budgets (per
 *  salted-IP hash and a global backstop, the playground-share pattern). */
export const GUEST_CUSTOM_TTL_DAYS = 30;
export const GUEST_CUSTOM_PER_IP_PER_DAY = 20;
export const GUEST_CUSTOM_GLOBAL_PER_DAY = 1000;

export function guestCustomExpiryIso(nowMs: number): string {
  return new Date(nowMs + GUEST_CUSTOM_TTL_DAYS * DAY_MS).toISOString();
}

/** A row is expired only via its fixed `expires_at` (guest rows). */
export function isCustomRowExpired(
  expiresAt: string | null,
  nowMs: number,
): boolean {
  return !!expiresAt && expiresAt <= new Date(nowMs).toISOString();
}

// ---------------------------------------------------------------------------
// Field-size ceilings (enforced by schema.ts validation)
// ---------------------------------------------------------------------------

export const CUSTOM_TITLE_MAX = 120;
export const CUSTOM_INSTRUCTIONS_MAX = 20_000;
export const CUSTOM_CODE_FIELD_MAX = 50_000;
export const CUSTOM_MCQ_MARKDOWN_MAX = 20_000;
export const CUSTOM_MAX_FILES = 8;
export const CUSTOM_MAX_TESTS = 20;
export const CUSTOM_MAX_PACKAGES = 10;
export const CUSTOM_SET_DESCRIPTION_MAX = 2_000;
export const CUSTOM_SET_MAX_ITEMS = 50;
/** Whole-payload ceiling (JSON-encoded), far under D1's 2 MB value cap. */
export const CUSTOM_PAYLOAD_MAX_BYTES = 256 * 1024;
