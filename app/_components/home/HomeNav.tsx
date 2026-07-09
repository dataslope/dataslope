"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "@base-ui-components/react/menu";
import { Dialog } from "@base-ui-components/react/dialog";
import {
  ChevronDown,
  LogOut,
  Menu as Hamburger,
  User as UserIcon,
  X,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth/client";
import type { IconType } from "react-icons";
import Link from "../Link";
import { AuthMenu, SIGN_IN_BUTTON_CLASS } from "../auth/AuthMenu";
import { GitHubIcon } from "./icons";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
import { ThemePillToggle } from "../ThemePillToggle";

const GITHUB_URL = "https://github.com/dataslope/dataslope/";

function LangIcon({
  id,
  size = 16,
  className = "text-[var(--ds-gray-600)] dark:text-[var(--ds-gray-300)]",
}: {
  id: string;
  size?: number;
  /** Tailwind colour classes for the (currentColor) glyph. */
  className?: string;
}) {
  const Icon: IconType | undefined = LANGUAGE_ICONS[id];
  if (!Icon) return null;
  const factor = LANGUAGE_ICON_SIZE_FACTOR[id] ?? 1;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      aria-hidden="true"
    >
      <Icon size={Math.round(size * factor)} />
    </span>
  );
}

/** Desktop primary-menu link. The item for the section being viewed renders
 *  in the brand accent (matching the courses-page mockup), derived from the
 *  current pathname, so `/courses/python-basics` still lights up "Courses". */
function NavLink({
  href,
  prefetch,
  children,
}: {
  href: string;
  prefetch?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]"
          : "text-[#121212] hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]"
      }`}
    >
      {children}
    </Link>
  );
}

function GitHubLink() {
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View source on GitHub"
      title="GitHub"
      className="inline-flex size-9 items-center justify-center rounded-lg text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-white dark:hover:bg-white/10"
    >
      <GitHubIcon size={18} />
    </a>
  );
}

/** Desktop "Playground" dropdown, a Base UI Menu styled to echo the
 *  playground switcher: a bordered, shadowed popup of language rows. */
function PlaygroundMenu() {
  return (
    <Menu.Root>
      <Menu.Trigger className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] data-[popup-open]:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)] dark:data-[popup-open]:text-[var(--ds-blue-400)]">
        Playground
        <ChevronDown
          size={14}
          className="transition-transform data-[popup-open]:rotate-180"
        />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="center" className="z-50">
          <Menu.Popup className="max-h-[70vh] min-w-56 overflow-y-auto rounded-xl border border-[var(--ds-gray-200)] bg-white p-1.5 shadow-xl shadow-black/5 outline-none transition-[opacity,transform] data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 dark:border-white/10 dark:bg-[#1a1a1a] dark:shadow-black/40">
            {PLAYGROUNDS.map((p) => (
              <Menu.Item
                key={p.id}
                className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--ds-gray-900)] outline-none transition-colors data-[highlighted]:bg-[var(--ds-gray-100)] data-[highlighted]:text-[var(--ds-gray-900)] dark:text-white dark:data-[highlighted]:bg-white/10 dark:data-[highlighted]:text-white"
                render={<Link href={p.href} prefetch={false} />}
              >
                <LangIcon
                  id={p.id}
                  className="text-[var(--ds-gray-900)] dark:text-white"
                />
                {p.label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="Dataslope home"
      className="flex items-center gap-2"
      // This nav only renders on "/", so a Link to "/" is a same-route no-op
      // and nothing appears to happen. Scroll back to the top instead, the
      // expected behaviour of clicking a site logo.
      onClick={() => {
        const reduce = window.matchMedia?.(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dataslope-logo-blue.svg"
        alt=""
        className="relative top-px h-[13px] w-auto"
        aria-hidden="true"
      />
      <span className="text-lg font-semibold tracking-tight text-[#121212] dark:text-white">
        Dataslope
      </span>
    </Link>
  );
}

/** Auth block for the top of the mobile drawer: a solid "Sign in" button (styled
 *  like the desktop control) when signed out, or the account name +
 *  Account/Sign-out actions when signed in. While the first session read is in
 *  flight a size-matched skeleton renders instead of "Sign in", so a signed-in
 *  visitor doing a full-page load doesn't see it flash before the account rows. */
function MobileAuthSection() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const rowClass =
    "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/10 dark:hover:text-white";

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
        render={<Link href="/account" prefetch={false} />}
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

/** Mobile slide-in drawer (a Base UI Dialog presented as a right-edge
 *  drawer) holding the same navigation the desktop bar exposes inline. */
function MobileDrawer() {
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

          {/* One unified scroll for all nav items (rather than a nested
              scrollbar on just the playground list). The header above and the
              footer below stay pinned. */}
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
            <Dialog.Close
              render={<Link href="/courses" prefetch={false} />}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              Courses
            </Dialog.Close>

            <Dialog.Close
              render={<Link href="/interview-prep" prefetch={false} />}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              Interview Prep
            </Dialog.Close>

            <Dialog.Close
              render={<Link href="/pricing" prefetch={false} />}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              Pricing
            </Dialog.Close>

            <div className="mt-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
              Playground
            </div>
            {PLAYGROUNDS.map((p) => (
              <Dialog.Close
                key={p.id}
                render={<Link href={p.href} prefetch={false} />}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--ds-gray-900)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-white dark:hover:bg-white/10 dark:hover:text-white"
              >
                <LangIcon
                  id={p.id}
                  className="text-[var(--ds-gray-900)] dark:text-white"
                />
                {p.label}
              </Dialog.Close>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[var(--ds-gray-200)] pt-3 dark:border-white/10">
            <ThemePillToggle />
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-[var(--ds-gray-200)] dark:hover:bg-white/10"
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
  // Shrink-on-scroll: the header is taller at the top of the page and
  // compacts to its sticky height once scrolled. The background stays a
  // solid white/#121212 (no backdrop blur, shadow, or opacity).
  //
  // Two thresholds (hysteresis) with a gap wider than the header's shrink
  // delta (≤16px). A single threshold caused an infinite bounce near the top:
  // toggling the header height changes the in-flow document height, and the
  // browser's scroll-anchoring nudges scrollY to compensate, which flips the
  // threshold back, resizing the header again, ad infinitum. The gap keeps that
  // compensation from ever crossing the opposite threshold.
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
    // Defer the initial read out of the effect body (handles back-nav into a
    // scrolled position without a synchronous setState).
    const raf = requestAnimationFrame(onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-[#121212]">
      <nav
        className={`mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 transition-[height] duration-200 sm:px-6 md:grid-cols-[1fr_auto_1fr] ${
          scrolled ? "h-11 md:h-12" : "h-14 md:h-16"
        }`}
      >
        {/* Left: brand */}
        <div className="flex items-center">
          <BrandLogo />
        </div>

        {/* Center: primary menu (desktop only, visibility handled by the
            hardened `.ds-nav-menu` rule in home.css so a leaked `.hidden`
            from a docs route can't keep it collapsed after a back-navigation). */}
        <div className="ds-nav-menu items-center justify-center gap-1">
          <NavLink href="/courses" prefetch>
            Courses
          </NavLink>
          <NavLink href="/interview-prep">Interview Prep</NavLink>
          <PlaygroundMenu />
          <NavLink href="/pricing">Pricing</NavLink>
        </div>

        {/* Right: theme + GitHub + (mobile) hamburger */}
        <div className="flex items-center justify-end gap-1">
          {/* Theme + GitHub are desktop-only; on mobile the drawer carries a
              theme switch and a GitHub link instead. */}
          <span className="ds-nav-icons items-center gap-2">
            <ThemePillToggle />
            <GitHubLink />
          </span>
          {/* Desktop-only: the mobile drawer carries its own auth control so
              this one isn't crammed next to the hamburger on small screens. */}
          <span className="ds-nav-auth">
            <AuthMenu />
          </span>
          <MobileDrawer />
        </div>
      </nav>
    </header>
  );
}
