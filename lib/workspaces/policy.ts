/**
 * Retention + quota policy for cloud saves and share links.
 *
 * All numbers here are the single source of truth for what the pricing page
 * promises (app/pricing + PricingSection): free members get a fixed storage
 * quota with a ~30-day inactivity cleanup, Pro removes the cleanup and raises
 * the quota, and guests can share (but not save) with a fixed link TTL.
 *
 * There is no cron: expiry is *evaluated at read time* (an expired row is
 * never listed or served) and enforced lazily, routes delete expired rows +
 * R2 objects when they encounter them. This keeps the promise exact without a
 * scheduled worker; actual byte reclamation can additionally be backstopped
 * with an R2 lifecycle rule on the `share/` prefix (see README).
 *
 * Pure module: no D1/R2 access, unit-tested in __tests__/workspacePolicy.test.ts.
 */

import type { MemberTier } from "@/lib/ai/types";

const MB = 1024 * 1024;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface PlanLimits {
  /** Combined quota (cloud saves + share snapshots), in bytes as stored. */
  totalBytes: number;
  /** Per-bundle ceiling (gzipped), in bytes. */
  maxItemBytes: number;
  maxWorkspaces: number;
  maxShares: number;
}

export const FREE_LIMITS: PlanLimits = {
  totalBytes: 100 * MB, // pricing: "100 MB of cloud storage"
  maxItemBytes: 25 * MB,
  maxWorkspaces: 100,
  maxShares: 100,
};

export const PRO_LIMITS: PlanLimits = {
  totalBytes: 10 * 1024 * MB, // pricing: "10 GB of cloud storage"
  maxItemBytes: 100 * MB,
  maxWorkspaces: 1000,
  maxShares: 1000,
};

export function limitsForTier(tier: MemberTier): PlanLimits {
  return tier === "pro" ? PRO_LIMITS : FREE_LIMITS;
}

/** Guest (anonymous) shares: size cap per snapshot + fixed link lifetime. */
export const GUEST_SHARE_MAX_BYTES = 10 * MB;
export const GUEST_SHARE_TTL_DAYS = 30;

/** Free-member retention: saves + shares expire after ~a month of inactivity
 *  (opening / saving a workspace or a share being viewed resets the clock). */
export const INACTIVITY_EXPIRY_DAYS = 30;

/** Guest share-creation rate limits (per salted-IP hash + a global backstop,
 *  both per UTC day, the ai_usage_daily pattern from migration 0003). */
export const GUEST_SHARES_PER_IP_PER_DAY = 10;
export const GUEST_SHARES_GLOBAL_PER_DAY = 500;

/** Display-name ceiling for workspaces + shares. */
export const NAME_MAX_LENGTH = 120;

/** Client-generated workspace ids (see newWorkspaceId in
 *  app/_components/opfs/workspace.ts). Scoped per user in D1, so the format
 *  check only guards key hygiene, not uniqueness. */
const WORKSPACE_ID_RE = /^ws_[a-z0-9_-]{4,64}$/i;

export function isValidWorkspaceId(id: string): boolean {
  return WORKSPACE_ID_RE.test(id);
}

export function normalizeName(raw: unknown, fallback: string): string {
  const name = typeof raw === "string" ? raw.trim() : "";
  return (name || fallback).slice(0, NAME_MAX_LENGTH);
}

/** ISO cutoff for the free-tier inactivity window: rows whose activity
 *  timestamp is older than this are expired. */
export function inactivityCutoffIso(nowMs: number): string {
  return new Date(nowMs - INACTIVITY_EXPIRY_DAYS * DAY_MS).toISOString();
}

/** Guest-share expiry timestamp minted at creation time. */
export function guestShareExpiryIso(nowMs: number): string {
  return new Date(nowMs + GUEST_SHARE_TTL_DAYS * DAY_MS).toISOString();
}

export interface ExpiryInput {
  /** Owner tier; guests pass "free" and rely on `expiresAt`. */
  tier: MemberTier;
  /** `last_used_at` (saves) or `last_viewed_at` (shares), ISO. */
  lastActiveAt: string;
  /** Fixed expiry (guest shares), ISO, or null. */
  expiresAt?: string | null;
  nowMs: number;
}

/**
 * The one retention rule, evaluated at read time:
 *  - a fixed `expiresAt` in the past always expires the row (guest shares);
 *  - otherwise pro rows never expire;
 *  - otherwise free rows expire after INACTIVITY_EXPIRY_DAYS of inactivity.
 */
export function isExpired({
  tier,
  lastActiveAt,
  expiresAt,
  nowMs,
}: ExpiryInput): boolean {
  const nowIso = new Date(nowMs).toISOString();
  if (expiresAt && expiresAt <= nowIso) return true;
  if (tier === "pro") return false;
  return lastActiveAt < inactivityCutoffIso(nowMs);
}

// ---------------------------------------------------------------------------
// Share slugs
// ---------------------------------------------------------------------------

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
export const SHARE_ID_LENGTH = 16; // ~82 bits over a 36-char alphabet

const SHARE_ID_RE = new RegExp(`^[a-z0-9]{${SHARE_ID_LENGTH}}$`);

export function isValidShareId(id: string): boolean {
  return SHARE_ID_RE.test(id);
}

/** Crypto-random share slug. Uses rejection sampling so every character is
 *  uniform (no modulo bias). Works in both the browser and workerd. */
export function newShareId(): string {
  const out: string[] = [];
  const bytes = new Uint8Array(SHARE_ID_LENGTH * 2);
  while (out.length < SHARE_ID_LENGTH) {
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (out.length >= SHARE_ID_LENGTH) break;
      // 216 = 36 * 6, the largest multiple of 36 below 256.
      if (b < 216) out.push(SLUG_ALPHABET[b % 36]);
    }
  }
  return out.join("");
}

// ---------------------------------------------------------------------------
// R2 keys
// ---------------------------------------------------------------------------

export function workspaceObjectKey(userId: string, workspaceId: string): string {
  return `usr/${userId}/${workspaceId}.bundle.gz`;
}

export function shareObjectKey(shareId: string): string {
  return `share/${shareId}.bundle.gz`;
}
