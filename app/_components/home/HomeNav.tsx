"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  BriefcaseBusiness,
  GraduationCap,
  LogIn,
  LogOut,
  Menu as Hamburger,
  SquareTerminal,
  Tag,
  User as UserIcon,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth/client";
import Link from "../Link";
import { AuthMenu, SIGN_IN_BUTTON_CLASS } from "../auth/AuthMenu";
import { GitHubIcon } from "./icons";
import { ThemePillToggle } from "../ThemePillToggle";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

/** Active-item colors: brand blue by default; Pricing goes green so its label
 *  and "Free" badge read as one unit. */
const ACTIVE_BLUE = "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]";
const ACTIVE_GREEN = "text-[var(--ds-green-500)]";

const NAV_SECTIONS: {
  href: string;
  label: string;
  icon: LucideIcon;
  prefetch?: boolean;
  /** Pill rendered after the label (see `NavBadge`). */
  badge?: string;
  /** Overrides {@link ACTIVE_BLUE} for the active item. */
  activeClass?: string;
}[] = [
  { href: "/courses", label: "Courses", icon: GraduationCap, prefetch: true },
  { href: "/interview-prep", label: "Interview Prep", icon: BriefcaseBusiness },
  { href: "/playground", label: "Playground", icon: SquareTerminal },
  // The "Free" badge stops "Pricing" reading as a paywall.
  {
    href: "/pricing",
    label: "Pricing",
    icon: Tag,
    badge: "Free",
    activeClass: ACTIVE_GREEN,
  },
];

/** The pill beside a nav label, in the pricing table's badge style a step
 *  smaller. Green in every state. */
function NavBadge({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--ds-green-500)] px-2 py-0.5 text-[11px] font-semibold leading-normal text-white">
      {children}
    </span>
  );
}

/** True when `pathname` is `href` or a page under it, so
 *  `/courses/python-basics` still lights up "Courses". */
function isActiveSection(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  href,
  prefetch,
  compact,
  badge,
  activeClass = ACTIVE_BLUE,
  children,
}: {
  href: string;
  prefetch?: boolean;
  /** Header scrolled past its threshold; type steps down with the bar. */
  compact?: boolean;
  badge?: string;
  activeClass?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = isActiveSection(pathname, href);
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      // font-size animates with the color so the step down moves with the
      // nav's height. Base size targets the tightest desktop band (md–lg).
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 font-medium transition-[color,font-size] duration-200 ${
        compact ? "text-[13px] lg:text-[14.5px]" : "text-[13px] lg:text-[15px]"
      } ${
        active
          ? activeClass
          : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {children}
      {badge && <NavBadge>{badge}</NavBadge>}
    </Link>
  );
}

function GitHubLink({ compact }: { compact?: boolean }) {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
      title="GitHub"
      className={`inline-flex items-center justify-center rounded-lg text-[#121212] transition-[color,background-color,width,height] duration-200 hover:bg-[var(--ds-gray-100)] dark:text-white dark:hover:bg-white/[0.06] ${
        compact ? "size-[34px]" : "size-9"
      }`}
    >
      <GitHubIcon size={compact ? 17 : 18} />
    </a>
  );
}

function BrandLogo({ compact }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="Dataslope home"
      className="group flex items-center gap-2"
      // This nav only renders on "/", where a Link to "/" is a no-op; scroll
      // to the top instead.
      onClick={() => {
        const reduce = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      {/* `will-change-transform` keeps permanent compositor layers on both
          hover transforms: layer churn inside the sticky header has caused
          stale marquee raster ghosting under it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dataslope-logo-blue.svg"
        alt=""
        // `height` (not `transform: scale`) so it can't fight the hover
        // rotate on the same property.
        className={`relative top-px w-auto transition-[transform,height] duration-200 will-change-transform group-hover:rotate-[8deg] ${
          compact ? "h-[12px]" : "h-[13px]"
        }`}
        aria-hidden="true"
      />
      {/* Wordmark hidden in the tightest desktop band (md–lg), where it
          pushes "Sign in" into wrapping. */}
      <span
        className={`font-semibold tracking-tight text-[#121212] transition-[transform,font-size] duration-200 will-change-transform group-hover:translate-x-0.5 md:hidden lg:inline dark:text-white ${
          compact ? "text-[17px]" : "text-lg"
        }`}
      >
        Dataslope
      </span>
    </Link>
  );
}

/** Auth block for the mobile drawer: "Sign in" when signed out, account rows
 *  when signed in. A size-matched skeleton renders while the session loads so
 *  "Sign in" doesn't flash for signed-in visitors. */
function MobileAuthSection() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const rowClass =
    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/[0.06] dark:hover:text-white";

  if (isPending) {
    return (
      <span
        aria-hidden="true"
        className="block h-9 w-full animate-pulse rounded-lg bg-[var(--ds-gray-100)] dark:bg-white/10"
      />
    );
  }

  if (!session) {
    return (
      <Dialog.Close
        render={<Link href="/sign-in" prefetch={false} />}
        className={`${SIGN_IN_BUTTON_CLASS} w-full justify-center`}
      >
        <LogIn size={14} aria-hidden="true" />
        Sign in
      </Dialog.Close>
    );
  }

  return (
    <>
      <div className="px-3 py-1.5 text-xs text-[var(--ds-gray-500)]">
        Signed in as{" "}
        <span className="font-medium text-[var(--ds-gray-800)] dark:text-[var(--ds-gray-200)]">
          {session.user.email}
        </span>
      </div>
      <Dialog.Close
        render={<Link href="/dashboard/account" prefetch={false} />}
        className={rowClass}
      >
        <UserIcon size={16} />
        Account
      </Dialog.Close>
      <button
        type="button"
        onClick={() => {
          void signOut().then(() => router.refresh());
        }}
        className={`${rowClass} w-full text-left`}
      >
        <LogOut size={16} />
        Sign out
      </button>
    </>
  );
}

/** Mobile slide-in drawer holding the same navigation as the desktop bar. */
function MobileDrawer() {
  const pathname = usePathname() ?? "";
  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label="Open menu"
        title="Menu"
        className="ds-mobile-trigger size-9 items-center justify-center rounded-lg text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-white dark:hover:bg-white/10"
      >
        <Hamburger size={18} />
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(82vw,320px)] flex-col border-l border-[var(--ds-gray-200)] bg-white p-4 shadow-2xl transition-transform duration-200 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full dark:border-white/10 dark:bg-[#121212]">
          {/* Top: close button, then the auth control (Sign in / account). */}
          <div className="mb-2 flex items-center justify-end">
            <Dialog.Close
              aria-label="Close menu"
              className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--ds-gray-500)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={18} />
            </Dialog.Close>
          </div>
          <div className="mb-2 flex flex-col gap-1 border-b border-[var(--ds-gray-200)] pb-3 dark:border-white/10">
            <MobileAuthSection />
          </div>

          {/* One unified scroll for all nav items; header and footer pinned. */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            {NAV_SECTIONS.map(({ href, label, icon: Icon, badge, activeClass }) => {
              const active = isActiveSection(pathname, href);
              return (
                <Dialog.Close
                  key={href}
                  render={<Link href={href} prefetch={false} />}
                  aria-current={active ? "page" : undefined}
                  // Same active color as the desktop menu; idle rows keep the
                  // drawer's own (darker) neutral.
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--ds-gray-100)] dark:hover:bg-white/[0.06] ${
                    active
                      ? (activeClass ?? ACTIVE_BLUE)
                      : "text-[var(--ds-gray-800)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:text-white"
                  }`}
                >
                  <Icon size={16} aria-hidden="true" />
                  {label}
                  {badge && <NavBadge>{badge}</NavBadge>}
                </Dialog.Close>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--ds-gray-200)] pt-3 dark:border-white/10">
            <ThemePillToggle />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-[var(--ds-gray-200)] dark:hover:bg-white/[0.06]"
            >
              <GitHubIcon size={16} />
              GitHub
            </a>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function HomeNav() {
  // Shrink-on-scroll. Only the inner <nav> changes height; the <header> box
  // stays a fixed h-14/16 — resizing the sticky layer mid-scroll reflowed the
  // page (scroll-anchoring bounce) and produced stale "ghost" slices of
  // marquee raster (GPU-only). Don't move the height transition back onto
  // the <header> box. Two thresholds (hysteresis) so scroll jitter can't
  // flap the transition.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () =>
      setScrolled((prev) => {
        const y = window.scrollY;
        if (!prev && y > 48) return true;
        if (prev && y < 12) return false;
        return prev;
      });
    window.addEventListener("scroll", onScroll, { passive: true });
    // Deferred initial read: handles back-nav into a scrolled position
    // without a synchronous setState.
    const raf = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    // `transform-gpu` keeps the sticky header on its own compositing layer so
    // hover repaints stay isolated from the animating hero marquee below.
    <header className="sticky top-0 z-40 h-14 transform-gpu md:h-16">
      {/* Opaque background tracking the nav's height, not the fixed header
          box's — otherwise the compacted header carries a dead white band
          below the content. A repaint inside the existing layer, not a
          resize of the layer itself. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-0 bg-white transition-[height] duration-200 dark:bg-[#121212] ${
          scrolled ? "h-11 md:h-12" : "h-14 md:h-16"
        }`}
      />
      <nav
        className={`relative mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 transition-[height] duration-200 sm:px-6 md:grid-cols-[1fr_auto_1fr] ${
          scrolled ? "h-11 md:h-12" : "h-14 md:h-16"
        }`}
      >
        {/* Left: brand */}
        <div className="flex items-center">
          <BrandLogo compact={scrolled} />
        </div>

        {/* Center: primary menu (desktop only; visibility hardened in
            home.css's `.ds-nav-menu` against a leaked `.hidden`). */}
        <div className="ds-nav-menu items-center justify-center gap-4 lg:gap-6">
          {NAV_SECTIONS.map(({ href, label, prefetch, badge, activeClass }) => (
            <NavLink
              key={href}
              href={href}
              prefetch={prefetch}
              compact={scrolled}
              badge={badge}
              activeClass={activeClass}
            >
              {label}
            </NavLink>
          ))}
        </div>

        {/* Right: theme + GitHub + (mobile) hamburger */}
        <div className="flex items-center justify-end gap-1">
          {/* Desktop-only; the mobile drawer carries its own. */}
          <span className="ds-nav-icons items-center gap-2">
            <ThemePillToggle />
            <GitHubLink compact={scrolled} />
          </span>
          {/* Desktop-only; the drawer has its own auth control. */}
          <span className="ds-nav-auth">
            <AuthMenu compact={scrolled} />
          </span>
          <MobileDrawer />
        </div>
      </nav>
      {/* Fade below the compacted header, at the background's bottom edge so
          it moves with the shrink. `will-change-[opacity]` keeps it on a
          permanent compositor layer — layer churn here has caused stale
          marquee raster ghosting. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 h-3 bg-gradient-to-b from-white to-transparent transition-[opacity,top] duration-200 will-change-[opacity] dark:from-[#121212] ${
          scrolled ? "top-11 opacity-100 md:top-12" : "top-full opacity-0"
        }`}
      />
    </header>
  );
}
