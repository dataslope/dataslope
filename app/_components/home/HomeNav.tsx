"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog } from "@base-ui-components/react/dialog";
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

/** The primary sections the header links to, with their lucide glyphs (shared
 *  by the desktop menu and the mobile drawer). */
const NAV_SECTIONS: {
  href: string;
  label: string;
  icon: LucideIcon;
  prefetch?: boolean;
}[] = [
  { href: "/courses", label: "Courses", icon: GraduationCap, prefetch: true },
  { href: "/interview-prep", label: "Interview Prep", icon: BriefcaseBusiness },
  { href: "/playground", label: "Playground", icon: SquareTerminal },
  { href: "/pricing", label: "Pricing", icon: Tag },
];

/** Desktop primary-menu link. The item for the section being viewed renders
 *  in the brand accent (matching the courses-page mockup), derived from the
 *  current pathname, so `/courses/python-basics` still lights up "Courses". */
function NavLink({
  href,
  prefetch,
  icon: Icon,
  children,
}: {
  href: string;
  prefetch?: boolean;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]"
          : "text-[#121212] hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]"
      }`}
    >
      <Icon size={15} aria-hidden="true" />
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
      className="inline-flex size-9 items-center justify-center rounded-lg text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-white dark:hover:bg-white/[0.06]"
    >
      <GitHubIcon size={18} />
    </a>
  );
}

function BrandLogo() {
  return (
    <Link
      href="/"
      aria-label="Dataslope home"
      className="group flex items-center gap-2"
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
        className="relative top-px h-[13px] w-auto transition-transform duration-200 group-hover:rotate-[8deg]"
        aria-hidden="true"
      />
      <span className="text-lg font-semibold tracking-tight text-[#121212] transition-transform duration-200 group-hover:translate-x-0.5 dark:text-white">
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
            {NAV_SECTIONS.map(({ href, label, icon: Icon }) => (
              <Dialog.Close
                key={href}
                render={<Link href={href} prefetch={false} />}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/[0.06] dark:hover:text-white"
              >
                <Icon size={16} aria-hidden="true" />
                {label}
              </Dialog.Close>
            ))}
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
          {NAV_SECTIONS.map(({ href, label, icon, prefetch }) => (
            <NavLink key={href} href={href} prefetch={prefetch} icon={icon}>
              {label}
            </NavLink>
          ))}
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
      {/* Short fade below the compacted header so its solid background melts
          into the page instead of slicing through content scrolling under it
          (most visible against the hero marquee). Hidden while the page is at
          the top, where the header sits in normal flow above the content. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 top-full h-3 bg-gradient-to-b from-white to-transparent transition-opacity duration-200 dark:from-[#121212] ${
          scrolled ? "opacity-100" : "opacity-0"
        }`}
      />
    </header>
  );
}
