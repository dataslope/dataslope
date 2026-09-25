import { Cloud, Link2, LogIn, Sparkles, UserRound } from "lucide-react";
import Link from "@/app/_components/Link";
import { FREE_LIMITS, GUEST_SHARE_TTL_DAYS } from "@/lib/workspaces/policy";

/** Where both buttons send the learner back to once they have an account. */
const RETURN_HERE = "?next=/dashboard/account";

/** Pricing's own figures, so this page cannot promise a different quota. */
const FREE_STORAGE_MB = Math.round(FREE_LIMITS.totalBytes / (1024 * 1024));

const PERKS = [
  {
    icon: Cloud,
    title: "Cloud saves",
    body: `Sync your playground workspaces across devices, with ${FREE_STORAGE_MB} MB of storage.`,
    tint: { background: "var(--green-soft)", color: "var(--green-text)" },
  },
  {
    icon: Link2,
    title: "Share links you control",
    body: `Copy or revoke a link any time. Links shared as a guest expire after ${GUEST_SHARE_TTL_DAYS} days.`,
    tint: { background: "var(--chip-bg)", color: "var(--label-icon)" },
  },
  {
    icon: Sparkles,
    title: "Ask AI",
    body: "Get help from the assistant in lessons, playgrounds and challenges, with a daily allowance.",
    // The AI accent the rest of the studio uses for AI features.
    tint: { background: "var(--ai-soft)", color: "var(--ai)" },
  },
] as const;

/**
 * The account page for someone who is not signed in.
 *
 * It keeps the signed-in page's frame (the same panel card, with a
 * placeholder where the avatar goes) so signing in swaps the contents rather
 * than the layout, and it answers the question a signed-out visitor actually
 * has here: what an account would add. The answer is deliberately modest,
 * because everything else on the site works without one, and saying so is
 * what stops the page reading as a paywall.
 */
export function GuestAccount() {
  return (
    <>
      <div className="rounded-2xl p-6" style={{ background: "var(--panel)" }}>
        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full"
            style={{ border: "1.5px dashed var(--faint)", color: "var(--muted)" }}
          >
            <UserRound size={24} strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
              You&apos;re browsing as a guest
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: "var(--muted)" }}>
              Everything on Dataslope works without an account.
            </p>
          </div>
        </div>

        <p
          className="mt-5 pt-5 text-[15px] leading-relaxed [text-wrap:pretty]"
          style={{ borderTop: "1px solid var(--divider)", color: "var(--text)" }}
        >
          Sign in to keep your playground work in the cloud, manage the links you
          share, and ask the AI assistant for help.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <Link href={`/sign-in${RETURN_HERE}`} className="ds-btn-primary">
            <LogIn size={16} aria-hidden="true" />
            Sign in
          </Link>
          <Link
            href={`/sign-up${RETURN_HERE}`}
            className="ds-btn-secondary"
            // `.ds-btn-secondary` is filled with `--panel`, which is this
            // card's own background; lift it off the card instead.
            style={{ background: "var(--main-bg)", boxShadow: "inset 0 0 0 1px var(--divider)" }}
          >
            Create a free account
          </Link>
        </div>
        <p className="mt-3 text-[13px]" style={{ color: "var(--muted)" }}>
          With Google, GitHub or email.
        </p>
      </div>

      <section aria-labelledby="account-perks" className="mt-8">
        <h2
          id="account-perks"
          className="text-[13px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: "var(--muted)" }}
        >
          What an account adds
        </h2>
        <ul
          className="mt-3 list-none overflow-hidden rounded-2xl p-0"
          style={{ border: "1px solid var(--divider)" }}
        >
          {PERKS.map(({ icon: Icon, title, body, tint }, i) => (
            <li
              key={title}
              className="flex gap-4 px-5 py-4"
              style={i > 0 ? { borderTop: "1px solid var(--divider)" } : undefined}
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
                style={tint}
              >
                <Icon size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold" style={{ color: "var(--ink)" }}>
                  {title}
                </h3>
                <p
                  className="mt-0.5 text-sm leading-relaxed [text-wrap:pretty]"
                  style={{ color: "var(--muted)" }}
                >
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <p
        className="mt-6 text-sm leading-relaxed [text-wrap:pretty]"
        style={{ color: "var(--muted)" }}
      >
        Courses, interview prep, challenges and every playground stay free without
        one, and your challenge progress and local saves are kept in this browser.{" "}
        <Link
          href="/pricing"
          className="font-medium underline-offset-2 hover:underline"
          style={{ color: "var(--green-text)" }}
        >
          Compare plans
        </Link>
      </p>
    </>
  );
}
