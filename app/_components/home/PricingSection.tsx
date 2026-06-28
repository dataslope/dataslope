"use client";

import { useState } from "react";
import { Check, Minus } from "lucide-react";

import Link from "../Link";

/** A single capability line, with an optional clarifying sub-note. Set
 *  `included: false` to render it as a muted, not-available row (kept in place
 *  so the feature rows line up across plans for direct comparison). */
type Feature = { text: string; note?: string; included?: boolean };

interface Plan {
  name: string;
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
  /** The promoted tier — green CTA + ribbon badge (no border/shadow). */
  highlighted?: boolean;
  badge?: string;
}

/** Shared, order-aligned feature rows. Every plan supplies one entry per row so
 *  comparable features (e.g. cloud storage) sit at the same vertical position. */
const FEATURE_COUNT = 8;

const PLANS: Plan[] = [
  {
    name: "Guest",
    description: "Jump straight in — no account needed.",
    priceMonthly: "$0",
    priceAnnual: "$0",
    noteMonthly: "No sign-in required",
    noteAnnual: "No sign-in required",
    features: [
      { text: "Full access to courses" },
      { text: "Full access to interview prep" },
      { text: "Full access to playgrounds" },
      { text: "Unlimited code executions" },
      {
        text: "Save workspaces locally",
        note: "Browser only — no cloud persistence",
      },
      { text: "No cloud storage", included: false },
      { text: "No playground sharing", included: false },
      {
        text: "3 “Ask AI” messages every 24 hours",
        note: "Across playgrounds, challenges, code blocks & lessons",
      },
    ],
    cta: "Get started",
    href: "/learn",
  },
  {
    name: "Free Member",
    description: "Register for free to save and share in the cloud.",
    priceMonthly: "$0",
    priceAnnual: "$0",
    noteMonthly: "Free forever",
    noteAnnual: "Free forever",
    features: [
      { text: "Full access to courses" },
      { text: "Full access to interview prep" },
      { text: "Full access to playgrounds" },
      { text: "Unlimited code executions" },
      {
        text: "Save workspaces locally and in the cloud",
        note: "Cloud saves auto-deleted after a month of inactivity",
      },
      {
        text: "100 MB of cloud storage",
        note: "Total across all playgrounds",
      },
      {
        text: "Share playgrounds",
        note: "Shared playgrounds deleted after a month of inactivity",
      },
      {
        text: "Up to 10 “Ask AI” messages every 24 hours",
        note: "Across playgrounds, challenges, code blocks & lessons",
      },
    ],
    cta: "Sign up free",
    href: "/learn",
  },
  {
    name: "Pro",
    description: "For people who live in their playgrounds.",
    priceMonthly: "$4.99",
    priceAnnual: "$40",
    noteMonthly: "per month",
    noteAnnual: "per year · about $3.33/mo",
    features: [
      { text: "Full access to courses" },
      { text: "Full access to interview prep" },
      { text: "Full access to playgrounds" },
      { text: "Unlimited code executions" },
      {
        text: "Save workspaces locally and in the cloud",
        note: "Kept forever while your membership is active",
      },
      {
        text: "10 GB of cloud storage",
        note: "Total across all playgrounds",
      },
      {
        text: "Share playgrounds",
        note: "Shared playgrounds never deleted while subscribed",
      },
      {
        text: "Unlimited “Ask AI” messages",
        note: "Fair use policy applies",
      },
    ],
    cta: "Go Pro",
    href: "/learn",
    highlighted: true,
    badge: "Unlimited AI Chat",
  },
];

// Explicit column placement keeps each plan in its own column while spanning
// all of the subgrid's rows.
const COL_START = ["lg:col-start-1", "lg:col-start-2", "lg:col-start-3"];

function FeatureRow({ feature, last }: { feature: Feature; last: boolean }) {
  const included = feature.included !== false;
  return (
    <div className={`flex gap-3 ${last ? "lg:pb-8" : ""}`}>
      {included ? (
        <Check
          size={20}
          className="mt-0.5 shrink-0 text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]"
          aria-hidden="true"
        />
      ) : (
        <Minus
          size={20}
          className="mt-0.5 shrink-0 text-[var(--ds-gray-300)] dark:text-[var(--ds-gray-600)]"
          aria-hidden="true"
        />
      )}
      <span
        className={`text-[15px] leading-snug ${
          included
            ? "text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-200)]"
            : "text-[var(--ds-gray-400)] dark:text-[var(--ds-gray-500)]"
        }`}
      >
        {feature.text}
        {feature.note && (
          <span className="mt-0.5 block text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
            {feature.note}
          </span>
        )}
      </span>
    </div>
  );
}

function PlanColumn({
  plan,
  annual,
  colClass,
}: {
  plan: Plan;
  annual: boolean;
  colClass: string;
}) {
  const price = annual ? plan.priceAnnual : plan.priceMonthly;
  const note = annual ? plan.noteAnnual : plan.noteMonthly;
  return (
    // On desktop each plan is a row-subgrid spanning all FEATURE_COUNT + 3 rows
    // so its header / price / CTA / feature rows align with the other plans.
    // Vertical padding is kept off the subgrid container (it would offset the
    // shared row tracks); top/bottom breathing room is added to the header and
    // last feature instead.
    <div
      className={`relative flex flex-col gap-3 px-6 py-6 lg:row-span-11 lg:row-start-1 lg:grid lg:grid-rows-subgrid lg:px-8 lg:py-0 ${colClass}`}
    >
      <div className="lg:pt-8">
        {plan.badge && (
          <span className="mb-3 inline-flex items-center rounded-full bg-[var(--ds-green-500)] px-3 py-1 text-xs font-semibold text-white lg:absolute lg:-top-3 lg:left-1/2 lg:mb-0 lg:-translate-x-1/2">
            {plan.badge}
          </span>
        )}
        <h3 className="text-lg font-semibold text-[var(--ds-gray-900)] dark:text-white">
          {plan.name}
        </h3>
        <p className="mt-1 text-sm text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
          {plan.description}
        </p>
      </div>

      <div>
        <span className="text-4xl font-medium tracking-tight text-[var(--ds-gray-900)] dark:text-white">
          {price}
        </span>
        <p className="mt-1 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
          {note}
        </p>
      </div>

      <Link
        href={plan.href}
        className={`inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          plan.highlighted
            ? "bg-[var(--ds-green-600)] text-white hover:bg-[var(--ds-green-700)]"
            : "border border-[var(--ds-gray-300)] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-100)] dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        }`}
      >
        {plan.cta}
      </Link>

      {plan.features.map((feature, i) => (
        <FeatureRow
          key={feature.text}
          feature={feature}
          last={i === FEATURE_COUNT - 1}
        />
      ))}
    </div>
  );
}

export function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const annual = billing === "annual";

  return (
    <section id="pricing" className="mx-auto w-full max-w-6xl px-4 sm:px-6">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-tight text-[var(--ds-gray-900)] sm:text-5xl dark:text-white">
          Pricing
        </h2>
        <p className="mt-8 text-base text-[var(--ds-gray-900)] sm:text-lg dark:text-white">
          Every course, interview track, and playground is free to use. Create a
          free account for cloud saves and sharing, or go Pro for storage that
          never expires.
        </p>
      </div>

      {/* Monthly / annual billing toggle — only the paid tier's price reacts. */}
      <div className="mb-10 flex items-center justify-center">
        <div className="inline-flex items-center rounded-full border border-[var(--ds-gray-200)] bg-white p-1 dark:border-white/10 dark:bg-white/5">
          {(["monthly", "annual"] as const).map((option) => {
            const active = billing === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setBilling(option)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
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
                    Save 33%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Comparison: one subtle gray surface, no gaps between plans, thin
          dividers between them, and feature rows aligned via subgrid. */}
      <div className="rounded-2xl border border-[var(--ds-gray-200)] bg-[var(--ds-gray-50)] dark:border-white/10 dark:bg-white/[0.03]">
        <div className="grid grid-cols-1 divide-y divide-[var(--ds-gray-200)] lg:grid-cols-3 lg:grid-rows-[repeat(11,auto)] lg:gap-y-3 lg:divide-x lg:divide-y-0 dark:divide-white/10">
          {PLANS.map((plan, i) => (
            <PlanColumn
              key={plan.name}
              plan={plan}
              annual={annual}
              colClass={COL_START[i]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
