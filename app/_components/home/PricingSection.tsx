"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import Link from "../Link";

/** A single capability line, with an optional clarifying sub-note. */
type Feature = { text: string; note?: string };

interface Plan {
  name: string;
  description: string;
  /** Price + sub-line per billing period. The free tiers ignore the toggle
   *  (both periods are identical). */
  priceMonthly: string;
  priceAnnual: string;
  noteMonthly: string;
  noteAnnual: string;
  features: Feature[];
  cta: string;
  href: string;
  /** Visually promote the paid tier. */
  highlighted?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Free Guest",
    description: "Jump straight in — no account needed.",
    priceMonthly: "$0",
    priceAnnual: "$0",
    noteMonthly: "No sign-in required",
    noteAnnual: "No sign-in required",
    features: [
      { text: "No sign-in required" },
      { text: "Full access to courses" },
      { text: "Full access to interview prep" },
      { text: "Full access to playgrounds" },
      { text: "Unlimited code executions" },
      {
        text: "Save playground workspaces locally",
        note: "Stored in your browser — no cloud persistence",
      },
      {
        text: "“Ask AI” up to 5 times every 24 hours",
        note: "Across playgrounds, code challenges, code blocks & lessons",
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
      { text: "Register for free" },
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
    ],
    cta: "Sign up free",
    href: "/learn",
  },
  {
    name: "Paid Member",
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
    ],
    cta: "Go Pro",
    href: "/learn",
    highlighted: true,
  },
];

function PlanCard({ plan, annual }: { plan: Plan; annual: boolean }) {
  const price = annual ? plan.priceAnnual : plan.priceMonthly;
  const note = annual ? plan.noteAnnual : plan.noteMonthly;
  return (
    <div
      className={`relative flex h-full flex-col rounded-2xl border p-6 sm:p-8 ${
        plan.highlighted
          ? "border-[var(--ds-green-500)] bg-[var(--ds-green-50)]/50 ring-1 ring-[var(--ds-green-500)] dark:border-[var(--ds-green-500)]/50 dark:bg-[var(--ds-green-500)]/[0.06] dark:ring-[var(--ds-green-500)]/50"
          : "border-[var(--ds-gray-200)] bg-white dark:border-white/10 dark:bg-white/5"
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--ds-green-500)] px-3 py-1 text-xs font-semibold text-white">
          Most popular
        </span>
      )}

      <h3 className="text-lg font-semibold text-[var(--ds-gray-900)] dark:text-white">
        {plan.name}
      </h3>
      <p className="mt-1 text-sm text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-400)]">
        {plan.description}
      </p>

      <div className="mt-6">
        <span className="text-4xl font-bold tracking-tight text-[var(--ds-gray-900)] dark:text-white">
          {price}
        </span>
        <p className="mt-1 text-sm text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
          {note}
        </p>
      </div>

      <Link
        href={plan.href}
        className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
          plan.highlighted
            ? "bg-[var(--ds-green-600)] text-white hover:bg-[var(--ds-green-700)]"
            : "border border-[var(--ds-gray-300)] text-[var(--ds-gray-900)] hover:bg-[var(--ds-gray-50)] dark:border-white/15 dark:text-white dark:hover:bg-white/10"
        }`}
      >
        {plan.cta}
      </Link>

      <ul className="mt-8 flex flex-col gap-3.5">
        {plan.features.map((feature) => (
          <li key={feature.text} className="flex gap-3">
            <Check
              size={20}
              className="mt-0.5 shrink-0 text-[var(--ds-green-600)] dark:text-[var(--ds-green-400)]"
              aria-hidden="true"
            />
            <span className="text-[15px] leading-snug text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-200)]">
              {feature.text}
              {feature.note && (
                <span className="mt-0.5 block text-[13px] text-[var(--ds-gray-500)] dark:text-[var(--ds-gray-400)]">
                  {feature.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
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

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard key={plan.name} plan={plan} annual={annual} />
        ))}
      </div>
    </section>
  );
}
