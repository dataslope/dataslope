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

/** Desktop primary-menu link (text-only; the icons in NAV_SECTIONS are for
 *  the mobile drawer). Idle items sit in a muted neutral with a subtle darken
 *  on hover; the item for the section being viewed renders in the brand
 *  accent (matching the courses-page mockup), derived from the current
 *  pathname, so `/courses/python-basics` still lights up "Courses". */
function NavLink({
  href,
  prefetch,
  compact,
  children,
}: {
  href: string;
  prefetch?: boolean;
  /** The header has been scrolled past its threshold, so the type steps down
   *  with everything else. Half a pixel: the compaction should read as the bar
   *  getting tighter, not as the type changing size. */
  compact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      // font-size is animated alongside the colour, so the step down happens
      // with the nav's height rather than snapping a frame ahead of it.
      className={`rounded-lg px-3 py-2 font-medium transition-[color,font-size] duration-200 ${
        compact ? "text-[14.5px]" : "text-[15px]"
      } ${
        active
          ? "text-[var(--ds-blue-700)] dark:text-[var(--ds-blue-400)]"
          : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200"
      }`}
    >
      {children}
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
      {/* Both hover transforms carry `will-change-transform` so these two
          elements keep permanent (tiny) compositor layers. Without it, each
          hover starts an accelerated transform transition that promotes and
          then drops a layer inside the sticky header — layer churn that has
          coincided with stale marquee raster ghosting through the band under
          the header (the original "hover a nav control" repro). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dataslope-logo-blue.svg"
        alt=""
        // `height` is animated rather than `transform: scale`, which would
        // fight the hover rotate on the same property and undo the layer
        // stability the comment above is about.
        className={`relative top-px w-auto transition-[transform,height] duration-200 will-change-transform group-hover:rotate-[8deg] ${
          compact ? "h-[12px]" : "h-[13px]"
        }`}
        aria-hidden="true"
      />
      <span
        className={`font-semibold tracking-tight text-[#121212] transition-[transform,font-size] duration-200 will-change-transform group-hover:translate-x-0.5 dark:text-white ${
          compact ? "text-[17px]" : "text-lg"
        }`}
      >
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
  // Shrink-on-scroll: the nav bar is taller at the top of the page and
  // compacts once scrolled. The background stays a solid white/#121212 (no
  // backdrop blur, shadow, or opacity).
  //
  // Only the inner <nav> changes height; the <header> box itself is a fixed
  // h-14/16. That keeps the shrink out of document flow (crossing a threshold
  // no longer reflows the page, the cause of an earlier scroll-anchoring
  // bounce) and, just as deliberately, keeps the header's composited layer a
  // constant size: this header sits over the hero marquee's continuously
  // animating composited rows, and resizing the sticky layer mid-scroll has
  // produced stale "ghost" slices of marquee raster in the strip it vacates
  // (GPU-only; not reproducible under software rasterization). Don't move the
  // height transition back onto the <header> box.
  //
  // Two thresholds (hysteresis) so small scroll jitter around a single
  // threshold can't flap the shrink transition back and forth.
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
    // `transform-gpu` (translateZ(0)) keeps the sticky header on its own
    // compositing layer, so hover repaints inside it (nav-link colour
    // transitions, the logo's group-hover transform) stay isolated from the
    // continuously-animating hero marquee below. Combined with the fixed
    // h-14/16 box (see above), it keeps that layer a constant size over the
    // marquee; the opaque occluder itself is the background div inside it.
    <header className="sticky top-0 z-40 h-14 transform-gpu md:h-16">
      {/* The opaque background, tracking the nav's height rather than the
          header box's. The box has to stay h-14/16 (see above), so painting
          the background across all of it left the compacted header carrying a
          16px band of dead white below the content before the fade began.
          Painting only as far as the nav puts the fade directly under the
          logo/menu row, and costs the occluder nothing the fade doesn't
          immediately cover. This is a repaint inside the header's existing
          layer, not a resize of the layer itself. */}
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

        {/* Center: primary menu (desktop only, visibility handled by the
            hardened `.ds-nav-menu` rule in home.css so a leaked `.hidden`
            from a docs route can't keep it collapsed after a back-navigation). */}
        <div className="ds-nav-menu items-center justify-center gap-4 lg:gap-6">
          {NAV_SECTIONS.map(({ href, label, prefetch }) => (
            <NavLink key={href} href={href} prefetch={prefetch} compact={scrolled}>
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
            <GitHubLink compact={scrolled} />
          </span>
          {/* Desktop-only: the mobile drawer carries its own auth control so
              this one isn't crammed next to the hamburger on small screens. */}
          <span className="ds-nav-auth">
            <AuthMenu compact={scrolled} />
          </span>
          <MobileDrawer />
        </div>
      </nav>
      {/* Short fade below the compacted header so its solid background melts
          into the page instead of slicing through content scrolling under it
          (most visible against the hero marquee). It sits at the background's
          bottom edge, not the header box's, so it moves up with the shrink
          instead of leaving a gap of flat colour behind it. Hidden while the
          page is at the top, where the header sits in normal flow above the
          content.
          `will-change-[opacity]` keeps this strip permanently on its own
          compositor layer: without it, the opacity transition creates and
          destroys a layer on every scroll-threshold crossing, right at the
          band under the header where stale marquee raster has ghosted. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 h-3 bg-gradient-to-b from-white to-transparent transition-[opacity,top] duration-200 will-change-[opacity] dark:from-[#121212] ${
          scrolled ? "top-11 opacity-100 md:top-12" : "top-full opacity-0"
        }`}
      />
    </header>
  );
}
