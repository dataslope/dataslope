"use client";

import { useEffect, useState } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { Dialog } from "@base-ui-components/react/dialog";
import { ChevronDown, Menu as Hamburger, Moon, Sun, X } from "lucide-react";
import type { IconType } from "react-icons";
import Link from "../Link";
import { GitHubIcon } from "./icons";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS,
  LANGUAGE_ICON_SIZE_FACTOR,
} from "../languageIcons";
import { useTheme } from "./theme";

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

/** Light/dark toggle. The displayed glyph is driven purely by the `.dark`
 *  class on <html> (set pre-hydration) so it never mismatches on hydration. */
function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle color theme"
      className="inline-flex size-9 items-center justify-center rounded-lg text-[#121212] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-white dark:hover:bg-white/10"
    >
      <Sun size={18} className="hidden dark:block" />
      <Moon size={18} className="block dark:hidden" />
    </button>
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

/** Desktop "Playground" dropdown — a Base UI Menu styled to echo the
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
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/dataslope-logo-blue.svg"
        alt=""
        className="h-4 w-auto"
        aria-hidden="true"
      />
      <span className="text-lg font-semibold tracking-tight text-[#121212] dark:text-white">
        Dataslope
      </span>
    </Link>
  );
}

/** Mobile slide-in drawer (a Base UI Dialog presented as a right-edge
 *  drawer) holding the same navigation the desktop bar exposes inline. */
function MobileDrawer() {
  const { toggle } = useTheme();
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
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(82vw,320px)] flex-col gap-1 border-l border-[var(--ds-gray-200)] bg-white p-4 shadow-2xl transition-transform duration-200 data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full dark:border-white/10 dark:bg-[#1a1a1a]">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold uppercase tracking-wide text-[var(--ds-gray-500)]">
              Menu
            </span>
            <Dialog.Close
              aria-label="Close menu"
              className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--ds-gray-500)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:hover:bg-white/10 dark:hover:text-white"
            >
              <X size={18} />
            </Dialog.Close>
          </div>

          <Dialog.Close
            render={<Link href="/learn" prefetch={false} />}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/10"
          >
            Courses
          </Dialog.Close>

          <Dialog.Close
            render={<Link href="/interview" prefetch={false} />}
            className="rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ds-gray-800)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-100)] dark:hover:bg-white/10"
          >
            Interview Prep
          </Dialog.Close>

          <div className="mt-2 px-3 text-xs font-semibold uppercase tracking-wide text-[var(--ds-gray-400)]">
            Playground
          </div>
          <div className="flex max-h-[40vh] flex-col overflow-y-auto">
            {PLAYGROUNDS.map((p) => (
              <Dialog.Close
                key={p.id}
                render={<Link href={p.href} prefetch={false} />}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] hover:text-[var(--ds-gray-900)] dark:text-[var(--ds-gray-200)] dark:hover:bg-white/10"
              >
                <LangIcon id={p.id} />
                {p.label}
              </Dialog.Close>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-[var(--ds-gray-200)] pt-3 dark:border-white/10">
            <button
              type="button"
              onClick={toggle}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--ds-gray-700)] transition-colors hover:bg-[var(--ds-gray-100)] dark:text-[var(--ds-gray-200)] dark:hover:bg-white/10"
            >
              <Sun size={16} className="hidden dark:block" />
              <Moon size={16} className="block dark:hidden" />
              Theme
            </button>
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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
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

        {/* Center: primary menu (desktop only — visibility handled by the
            hardened `.ds-nav-menu` rule in home.css so a leaked `.hidden`
            from /learn can't keep it collapsed after a back-navigation). */}
        <div className="ds-nav-menu items-center justify-center gap-1">
          <Link
            href="/learn"
            prefetch
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]"
          >
            Courses
          </Link>
          <Link
            href="/interview"
            prefetch={false}
            className="rounded-lg px-3 py-2 text-sm font-medium text-[#121212] transition-colors hover:text-[var(--ds-blue-700)] dark:text-white dark:hover:text-[var(--ds-blue-400)]"
          >
            Interview Prep
          </Link>
          <PlaygroundMenu />
        </div>

        {/* Right: theme + GitHub + (mobile) hamburger */}
        <div className="flex items-center justify-end gap-1">
          <ThemeToggle />
          <GitHubLink />
          <MobileDrawer />
        </div>
      </nav>
    </header>
  );
}
