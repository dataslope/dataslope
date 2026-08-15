"use client";

import { useState } from "react";
import {
  Briefcase,
  Check,
  CloudUpload,
  Database,
  GraduationCap,
  HardDrive,
  Play,
  Share2,
  Sparkle,
  SquareTerminal,
  X,
  type LucideIcon,
} from "lucide-react";

import { fadedbar } from "tabbied/patterns";

import Link from "../Link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth/client";
import { Highlighter } from "@/components/ui/highlighter";
import { PatternBackdrop } from "../PatternBackdrop";
import { stashCheckoutPeriod, startProCheckout } from "../billing/proCheckout";

/** A capability line. `included: false` renders a not-available row (red ✕),
 *  kept in place so rows line up across plans. */
type Feature = {
  text: string;
  icon?: LucideIcon;
  note?: string;
  included?: boolean;
  /** Substring of `text` to wrap in a Magic UI underline highlight. */
  highlight?: string;
};

interface Plan {
  name: string;
  /** Illustration slug shown at the right end of the column's title line. */
  iconSlug: string;
  description: string;
  /** Price + sub-line per billing period. The free tiers ignore the toggle
   *  (both periods are identical). */
  priceMonthly: string;
  priceAnnual: string;
  noteMonthly: string;
  noteAnnual: string;
  /** Exactly FEATURE_COUNT entries, in the same order across every plan so the
   *  rows align horizontally (enforced by the subgrid layout). */
  features: Feature[];
  cta: string;
  href: string;
  /** The promoted tier, green CTA + inline badge (no border/shadow). */
  highlighted?: boolean;
  badge?: string;
  /** CTA starts a Polar checkout (signed-in users) instead of navigating. */
  checkout?: boolean;
}

// Feature rows per plan. If you change this, also update the hardcoded
// subgrid row counts in the render below (FEATURE_COUNT + 3) — Tailwind
// needs literal class strings.
const FEATURE_COUNT = 8;

const PLANS: Plan[] = [
  {
    name: "Guest",
    iconSlug: "pricing-guest",
    description: "Jump straight in, sign-in optional.",
    priceMonthly: "$0",
    priceAnnual: "$0",
    noteMonthly: "No account needed",
    noteAnnual: "No account needed",
    features: [
      { icon: GraduationCap, text: "Full access to courses" },
      { icon: Briefcase, text: "Full access to interview prep" },
      { icon: SquareTerminal, text: "Full access to playgrounds" },
      { icon: Play, text: "Unlimited code executions" },
      {
        icon: HardDrive,
        text: "Save workspaces locally",
        note: "Browser only, no cloud persistence",
      },
      { text: "No cloud storage", included: false },
      {
        icon: Share2,
        text: "Share playgrounds",
        note: "Share links expire 30 days after creation",
      },
      { text: "No “Ask AI” messages", included: false },
    ],
    cta: "Get started",
    href: "/courses",
  },
  {
    name: "Free Member",
    iconSlug: "pricing-free-member",
    description: "Register for free to save and share in the cloud.",
    priceMonthly: "$0",
    priceAnnual: "$0",
    noteMonthly: "Free forever",
    noteAnnual: "Free forever",
    features: [
      { icon: GraduationCap, text: "Full access to courses" },
      { icon: Briefcase, text: "Full access to interview prep" },
      { icon: SquareTerminal, text: "Full access to playgrounds" },
      { icon: Play, text: "Unlimited code executions" },
      {
        icon: CloudUpload,
        text: "Save workspaces locally and in the cloud",
        note: "Cloud saves auto-deleted after a month of inactivity",
      },
      {
        icon: Database,
        text: "100 MB of cloud storage",
        note: "Total across all playgrounds",
      },
      {
        icon: Share2,
        text: "Share playgrounds",
        note: "Shared playgrounds deleted after a month of inactivity",
      },
      {
        icon: Sparkle,
        text: "Up to 10 “Ask AI” messages every 24 hours",
        note: "Across playgrounds, challenges, code blocks & lessons",
      },
    ],
    cta: "Sign up for free",
    href: "/sign-up",
    // Promoted tier: green CTA, green icon, and a "Recommended" badge.
    highlighted: true,
    badge: "Recommended",
  },
  // Pro is intentionally hidden (SHOW_PRO_PLAN below) but its plan object and
  // all billing wiring (ProCheckoutCta, startProCheckout, Polar checkout) are
  // deliberately left in place — do not delete. To restore: flip
  // SHOW_PRO_PLAN, re-add the "AI-suggested autocomplete" rows (bumping
  // FEATURE_COUNT), and widen the grid (see grid-cols / subgrid-row comments).
  {
    name: "Pro",
    iconSlug: "pricing-pro",
    description: "For people who live in their playgrounds.",
    priceMonthly: "$4.99",
    priceAnnual: "$40",
    noteMonthly: "per month",
    noteAnnual: "per year · about $3.33/mo",
    features: [
      { icon: GraduationCap, text: "Full access to courses" },
      { icon: Briefcase, text: "Full access to interview prep" },
      { icon: SquareTerminal, text: "Full access to playgrounds" },
      { icon: Play, text: "Unlimited code executions" },
      {
        icon: CloudUpload,
        text: "Save workspaces locally and in the cloud",
        note: "Kept forever while your membership is active",
      },
      {
        icon: Database,
        text: "10 GB of cloud storage",
        note: "Total across all playgrounds",
        highlight: "10 GB",
      },
      {
        icon: Share2,
        text: "Share playgrounds",
        note: "Shared playgrounds never deleted while subscribed",
      },
      {
        icon: Sparkle,
        text: "Unlimited “Ask AI” messages",
        note: "Fair use policy applies",
        highlight: "Unlimited",
      },
    ],
    cta: "Go Pro",
    href: "/courses",
    highlighted: true,
    badge: "Unlimited AI Chat",
    checkout: true,
  },
];

// Flip to `true` to restore Pro (see the checklist above).
const SHOW_PRO_PLAN = false;
const VISIBLE_PLANS = PLANS.filter((p) => SHOW_PRO_PLAN || p.name !== "Pro");

// Shown above the table in place of the billing toggle while Pro is hidden.
const NO_CATCH = ["No credit card", "No trial period", "No expiry"];

// Explicit column placement keeps each plan in its own column while spanning
// all of the subgrid's rows.
const COL_START = ["lg:col-start-1", "lg:col-start-2", "lg:col-start-3"];

/** Two features are "the same" (so the row can be collapsed on mobile) when
 *  their text, note, and availability all match. */
function sameFeature(a: Feature, b: Feature): boolean {
  return (
    a.text === b.text &&
    (a.note ?? "") === (b.note ?? "") &&
    (a.included !== false) === (b.included !== false)
  );
}

/** Render the feature text, wrapping `feature.highlight` (if present) in a
 *  Magic UI underline highlight. */
function FeatureText({ feature }: { feature: Feature }) {
  const at = feature.highlight ? feature.text.indexOf(feature.highlight) : -1;
  if (!feature.highlight || at === -1) return <>{feature.text}</>;
  return (
    <>
      {feature.text.slice(0, at)}
      <Highlighter action="underline" color="#20C621" padding={-2} isView>
        <span className="font-semibold">{feature.highlight}</span>
      </Highlighter>
      {feature.text.slice(at + feature.highlight.length)}
    </>
  );
}

function FeatureRow({
  feature,
  last,
  mobileHidden = false,
}: {
  feature: Feature;
  last: boolean;
  /** Hide on mobile: identical to the previous plan's row, replaced there by
   *  the "Everything in <plan>, plus" line. */
  mobileHidden?: boolean;
}) {
  const included = feature.included !== false;
  const Icon = included ? (feature.icon ?? Check) : X;
  return (
    <div
      className={`${mobileHidden ? "hidden lg:flex" : "flex"} gap-3 ${last ? "lg:pb-8" : ""}`}
    >
      <span
        className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
          included ? "bg-[var(--ds-green-500)]" : "bg-[var(--ds-red-500)]"
        }`}
        aria-hidden="true"
      >
        <Icon size={12} strokeWidth={2.5} className="text-white" />
      </span>
      {/* leading-relaxed so the Magic UI underline under a highlighted word
          clears the wrapped continuation line. Applied to every column for
          vertical consistency. */}
      <span className="text-[15px] leading-relaxed text-[var(--ds-gray-900)] dark:text-white">
        <FeatureText feature={feature} />
        {feature.note && (
          <span className="mt-0.5 block text-[13px] text-[var(--ds-gray-400)]">
            {feature.note}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Pro CTA: signed out → /sign-in (the Polar customer is keyed to the user
 * id); already Pro → /account; signed-in free member → Polar hosted checkout
 * for the selected period. If billing isn't configured the button says so.
 */
function ProCheckoutCta({ plan, annual }: { plan: Plan; annual: boolean }) {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionUser = session?.user as
    | { plan?: string; role?: string }
    | undefined;
  // Admins are treated as Pro everywhere (lib/ai/tier.ts): route to account,
  // not into a checkout for a plan they effectively have.
  const isPro =
    (sessionUser?.plan ?? "").toLowerCase() === "pro" ||
    sessionUser?.role === "admin";

  async function handleClick() {
    setError(null);
    // Ignore clicks while the session fetch is in flight — a signed-in user
    // would otherwise be misrouted to /sign-in.
    if (isPending) return;
    if (!session) {
      // Remember the billing period across the sign-in detour; /account's
      // Upgrade button honors it (otherwise annual silently becomes monthly).
      // ?next= pins the destination.
      stashCheckoutPeriod(annual ? "annual" : "monthly");
      router.push("/sign-in?next=/dashboard/account");
      return;
    }
    if (isPro) {
      router.push("/dashboard/account");
      return;
    }
    setBusy(true);
    const checkoutError = await startProCheckout(annual ? "annual" : "monthly");
    // On success the browser navigates to Polar; we only get here on failure.
    if (checkoutError) setError(checkoutError);
    setBusy(false);
  }

  return (
    <div className="my-3">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--ds-green-600)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-green-700)] disabled:opacity-60"
      >
        {busy ? "Opening checkout…" : isPro ? "Manage your plan" : plan.cta}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-center text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

function PlanColumn({
  plan,
  annual,
  colClass,
  prevPlan,
}: {
  plan: Plan;
  annual: boolean;
  colClass: string;
  /** The plan one tier down (undefined for Guest); its repeated rows collapse
   *  on mobile behind an "Everything in <plan>, plus" line. */
  prevPlan?: Plan;
}) {
  const price = annual ? plan.priceAnnual : plan.priceMonthly;
  const note = annual ? plan.noteAnnual : plan.noteMonthly;

  return (
    // Each plan is a row-subgrid spanning FEATURE_COUNT + 3 rows so rows
    // align across plans. Vertical padding stays off the subgrid container
    // (it would offset the shared row tracks).
    <div
      className={`flex flex-col gap-3 px-6 py-6 lg:row-span-11 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:px-8 lg:py-0 ${colClass}`}
    >
      {/* `relative` so the marmot is lifted out of flow below — in flow a
          120px image would set the row height and break column alignment. */}
      <div className="relative lg:pt-8">
        <div className="flex items-center gap-2.5">
          <h3 className="text-lg font-semibold text-[var(--ds-gray-900)] dark:text-white">
            {plan.name}
          </h3>
          {plan.badge && (
            <span className="inline-flex items-center rounded-full bg-[var(--ds-green-500)] px-2.5 py-0.5 text-xs font-semibold text-white">
              {plan.badge}
            </span>
          )}
        </div>
        {/* Decorative (aria-hidden: the plan name already names the tier).
            Deliberately overhangs the card's top edge; -40% rather than -50%
            so it reads as resting on the edge. Below `lg` the values change
            because the column becomes a full-width row: `-right-6`
            compensates for the cut-out's transparent margin so the drawing
            sits flush with the card edge; `-translate-y-[60%]` compensates
            for the missing desktop header padding; `size-24` keeps the art
            clear of the "Recommended" badge on narrow phones. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/images/${plan.iconSlug}-cutout.webp`}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
          className="pointer-events-none absolute -right-6 top-1/2 size-24 -translate-y-[60%] object-contain lg:right-0 lg:size-[120px] lg:-translate-y-[40%]"
        />
      </div>

      <div>
        <span className="text-4xl font-medium tracking-tight text-[var(--ds-gray-900)] dark:text-white">
          {price}
        </span>
        {/* Billing-period suffix, moved by the toggle when there is one
            (always "/ month" while Pro is hidden). */}
        <span className="ml-1 text-base font-normal text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
          {annual ? "/ year" : "/ month"}
        </span>
        <p className="mt-1 text-[15px] text-[var(--ds-gray-900)] dark:text-white">
          {note}
        </p>
      </div>

      {/* Extra breathing room above and below the button. */}
      {plan.checkout ? (
        <ProCheckoutCta plan={plan} annual={annual} />
      ) : (
        <Link
          href={plan.href}
          className={`my-3 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
            plan.highlighted
              ? "bg-[var(--ds-green-600)] text-white hover:bg-[var(--ds-green-700)]"
              : "bg-[var(--ds-green-50)] text-[var(--ds-green-700)] hover:bg-[var(--ds-green-100)] dark:bg-[var(--ds-green-500)]/10 dark:text-[var(--ds-green-300)] dark:hover:bg-[var(--ds-green-500)]/15"
          }`}
        >
          {plan.cta}
        </Link>
      )}

      {/* Mobile only: stacked columns lead with "Everything in <plan>, plus"
          and show only the differing rows; desktop renders every row. */}
      {prevPlan && (
        <div className="flex items-center gap-3 lg:hidden">
          <span
            className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ds-green-500)]"
            aria-hidden="true"
          >
            <Check size={12} strokeWidth={2.5} className="text-white" />
          </span>
          <span className="text-[15px] font-semibold leading-snug text-[var(--ds-gray-900)] dark:text-white">
            Everything in {prevPlan.name}, plus:
          </span>
        </div>
      )}

      {plan.features.map((feature, i) => (
        <FeatureRow
          key={feature.text}
          feature={feature}
          last={i === FEATURE_COUNT - 1}
          mobileHidden={
            prevPlan !== undefined &&
            prevPlan.features[i] !== undefined &&
            sameFeature(feature, prevPlan.features[i])
          }
        />
      ))}
    </div>
  );
}

export function PricingSection({
  /** Render the section's own "Pricing" title + blurb; /pricing turns this
   *  off because it has its own page-level heading. */
  showHeading = true,
}: {
  showHeading?: boolean;
} = {}) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const annual = billing === "annual";

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      {showHeading && (
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
            Pricing
          </h2>
          <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
            Every course, interview track, and playground is free to use, and
            anyone can share a playground with a link. Create a free account to
            save and share your work in the cloud.
          </p>
        </div>
      )}

      {/* Billing toggle when there is something to bill for; the "no catch"
          strip while Pro is hidden (a toggle over all-$0 columns was a dead
          control). Restoring Pro is one flag: SHOW_PRO_PLAN. */}
      {SHOW_PRO_PLAN ? (
      <div className="mb-10 flex items-center justify-center">
        <div className="inline-flex items-center rounded-full border border-[var(--ds-gray-200)] bg-white p-1 dark:border-white/15 dark:bg-[#121212]">
          {(["monthly", "annual"] as const).map((option) => {
            const active = billing === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setBilling(option)}
                aria-pressed={active}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--ds-gray-900)] text-white dark:bg-white dark:text-[#121212]"
                    : "text-[var(--ds-gray-600)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-300)] dark:hover:text-white"
                }`}
              >
                {option === "monthly" ? "Monthly" : "Annual"}
                {option === "annual" && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[0.7rem] font-semibold ${
                      active
                        ? "bg-[var(--ds-green-500)] text-white"
                        : "bg-[var(--ds-green-50)] text-[var(--ds-green-700)] dark:bg-[var(--ds-green-500)]/15 dark:text-[var(--ds-green-300)]"
                    }`}
                  >
                    Best value
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      ) : (
        <ul className="mb-10 flex flex-wrap items-center justify-center gap-2.5">
          {NO_CATCH.map((assurance) => (
            <li
              key={assurance}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--ds-gray-200)] bg-white py-1.5 pr-4 pl-2 text-[15px] font-medium text-[var(--ds-gray-900)] dark:border-white/15 dark:bg-[#121212] dark:text-white"
            >
              <span
                className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--ds-green-500)]"
                aria-hidden="true"
              >
                <Check size={12} strokeWidth={2.5} className="text-white" />
              </span>
              {assurance}
            </li>
          ))}
        </ul>
      )}

      {/* Comparison table: feature rows aligned via subgrid; the striped
          shell sits behind an opaque surface so it only shows in the offset
          sliver. */}
      {/* Fadedbar backdrop (same pattern as the /playground hero band); only
          visible where it extends past the opaque table. The last 96px fade
          out so the tail doesn't read as a band, and the trailing margin
          clears the 120px overhang before the next section. */}
      <PatternBackdrop
        pattern={fadedbar}
        insetTop={72}
        insetBottom={-120}
        fullWidth
        fadeBottom={96}
        inks={[
          "rgba(128,128,128,0.24)",
          "rgba(20,140,255,0.18)",
          "rgba(32,198,33,0.20)",
        ]}
        cellSize={54}
        className="mb-40 sm:mb-44"
      >
        <div className="ds-striped-shell rounded-2xl">
          <div className="rounded-2xl border border-[var(--ds-gray-200)] bg-white dark:border-white/10 dark:bg-[#121212]">
            {/* Subgrid row count is FEATURE_COUNT + 3 (header/price/CTA),
                as literal class strings for Tailwind's JIT. */}
            <div
              className={`grid grid-cols-1 divide-y divide-[var(--ds-gray-200)] lg:grid-rows-[repeat(11,auto)] lg:gap-y-3 lg:divide-x lg:divide-y-0 dark:divide-white/10 ${
                SHOW_PRO_PLAN ? "lg:grid-cols-3" : "lg:grid-cols-2"
              }`}
            >
              {VISIBLE_PLANS.map((plan, i) => (
                <PlanColumn
                  key={plan.name}
                  plan={plan}
                  annual={annual}
                  colClass={COL_START[i]}
                  prevPlan={i > 0 ? VISIBLE_PLANS[i - 1] : undefined}
                />
              ))}
            </div>
          </div>
        </div>
      </PatternBackdrop>
    </section>
  );
}
