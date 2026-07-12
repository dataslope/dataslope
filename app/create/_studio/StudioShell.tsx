"use client";

/**
 * The /create "Studio" dashboard shell: a persistent sidebar + top bar that
 * wraps the hub and every builder (rendered by app/create/layout.tsx). Ported
 * from the Create Studio design handoff. The active nav item + breadcrumb come
 * from the pathname, so the shell stays mounted across navigations while the
 * content (children) swaps.
 *
 * Sidebar behavior mirrors the design's three states:
 *   - desktop full (264px), the default;
 *   - desktop rail (64px icon-only) after the user collapses it;
 *   - a drawer overlay on narrow viewports (opened by the top-bar toggle).
 *
 * Theme flips via the site-wide ThemePillToggle (siteTheme.ts); colors resolve
 * from the scoped tokens in studio.css.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Menu, PanelLeft, Plus } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { ThemePillToggle } from "@/app/_components/ThemePillToggle";
import {
  activeKeyForPath,
  CREATE_ITEMS,
  crumbFor,
  PAGE_ITEMS,
  type StudioNavItem,
  type StudioRouteKey,
} from "./nav";
import { useIsDesktop } from "./useIsDesktop";
import { StudioAiPanel } from "./StudioAiPanel";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/create";
  const active = activeKeyForPath(pathname);
  const isDesktop = useIsDesktop();
  const { data: session } = useSession();

  const [railed, setRailed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(true);

  // `role`/`plan` are auth additionalFields, not on the inferred client
  // session type, so read them the way AccountClient does (a cast).
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  const pageItems = PAGE_ITEMS.filter((i) => i.key !== "admin" || isAdmin);

  const toggleSidebar = () => {
    if (isDesktop) setRailed((r) => !r);
    else setDrawerOpen((o) => !o);
  };
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div
      className="ds-studio flex h-screen overflow-hidden"
      style={{ background: "var(--page-bg)", color: "var(--text)" }}
    >
      {/* Mobile drawer backdrop */}
      {drawerOpen ? (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
          aria-hidden="true"
        />
      ) : null}

      {/* Desktop sidebar: full or rail */}
      {isDesktop && !railed ? (
        <FullSidebar
          active={active}
          createOpen={createOpen}
          onToggleCreate={() => setCreateOpen((o) => !o)}
          pageItems={pageItems}
          session={session}
        />
      ) : null}
      {isDesktop && railed ? (
        <RailSidebar active={active} pageItems={pageItems} />
      ) : null}

      {/* Mobile drawer sidebar */}
      {drawerOpen ? (
        <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
          <FullSidebar
            active={active}
            createOpen={createOpen}
            onToggleCreate={() => setCreateOpen((o) => !o)}
            pageItems={pageItems}
            session={session}
            onNavigate={closeDrawer}
            elevated
          />
        </div>
      ) : null}

      {/* Main column */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{ background: "var(--main-bg)" }}
      >
        <TopBar active={active} onToggleSidebar={toggleSidebar} isDesktop={isDesktop} />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1280px] px-4 pb-24 pt-5 sm:px-6 lg:px-8 lg:pt-7">
            {children}
          </div>
        </div>
      </div>

      {/* AI assist panel (builder routes only, when opened) */}
      <StudioAiPanel />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebars
// ---------------------------------------------------------------------------

type SessionData = ReturnType<typeof useSession>["data"];

function FullSidebar({
  active,
  createOpen,
  onToggleCreate,
  pageItems,
  session,
  onNavigate,
  elevated,
}: {
  active: StudioRouteKey;
  createOpen: boolean;
  onToggleCreate: () => void;
  pageItems: StudioNavItem[];
  session: SessionData;
  onNavigate?: () => void;
  elevated?: boolean;
}) {
  return (
    <aside
      aria-label="Studio navigation"
      className="flex w-[264px] flex-shrink-0 flex-col overflow-y-auto px-3 pb-3 pt-4"
      style={{
        background: elevated ? "var(--main-bg)" : "var(--side-bg)",
        boxShadow: elevated ? "0 10px 40px rgba(0,0,0,0.25)" : "none",
        height: "100%",
      }}
    >
      <Link
        href="/create"
        onClick={onNavigate}
        className="flex items-center gap-2 px-2.5 pt-1"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dataslope-logo-blue.svg"
          alt=""
          className="h-[13px] w-auto"
          style={{ position: "relative", top: 1 }}
        />
        <span
          className="text-base font-semibold tracking-tight"
          style={{ color: "var(--ink)" }}
        >
          Dataslope
        </span>
      </Link>

      <nav className="mt-6 flex flex-col gap-0.5">
        <button
          type="button"
          onClick={onToggleCreate}
          className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-sm font-medium"
          style={{ color: "var(--text)" }}
        >
          <Plus size={17} style={{ color: "var(--muted)" }} />
          Create
          <ChevronRight
            size={14}
            className="ml-auto transition-transform"
            style={{
              color: "var(--faint)",
              transform: createOpen ? "rotate(90deg)" : "none",
            }}
          />
        </button>

        {createOpen ? (
          <div
            className="ml-[18px] mb-1 mt-0.5 flex flex-col gap-0.5 pl-[9px]"
            style={{ borderLeft: "1px solid var(--divider)" }}
          >
            {CREATE_ITEMS.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                active={active === item.key}
                onNavigate={onNavigate}
                small
              />
            ))}
          </div>
        ) : null}

        {pageItems.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            active={active === item.key}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="flex-1" />

      <UserFooter session={session} />
    </aside>
  );
}

function NavLink({
  item,
  active,
  onNavigate,
  small,
}: {
  item: StudioNavItem;
  active: boolean;
  onNavigate?: () => void;
  small?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`flex items-center rounded-[10px] font-medium ${
        small ? "gap-2.5 rounded-[9px] px-2.5 py-[7px] text-[13px]" : "gap-2.5 px-2.5 py-2 text-sm"
      }`}
      style={{
        background: active ? "var(--side-active)" : "transparent",
        color: active ? "var(--ink)" : small ? "var(--muted)" : "var(--text)",
      }}
    >
      <Icon
        size={17}
        className="flex-shrink-0"
        style={{ color: active ? "var(--green-text)" : "var(--muted)" }}
      />
      {item.label}
    </Link>
  );
}

function RailSidebar({
  active,
  pageItems,
}: {
  active: StudioRouteKey;
  pageItems: StudioNavItem[];
}) {
  return (
    <aside
      aria-label="Studio navigation"
      className="flex w-16 flex-shrink-0 flex-col items-center gap-1 pb-3 pt-4"
    >
      <Link
        href="/create"
        title="Dataslope"
        className="mb-3.5 flex h-10 w-10 items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dataslope-logo-blue.svg" alt="Dataslope" className="h-[15px] w-auto" />
      </Link>
      <div
        className="flex flex-col gap-0.5 rounded-2xl p-1"
        style={{ background: "var(--rail-group)" }}
      >
        {CREATE_ITEMS.map((item) => (
          <RailLink key={item.key} item={item} active={active === item.key} />
        ))}
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {pageItems.map((item) => (
          <RailLink key={item.key} item={item} active={active === item.key} />
        ))}
      </div>
    </aside>
  );
}

function RailLink({ item, active }: { item: StudioNavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      aria-label={item.label}
      className="ds-rail-item flex h-[38px] w-[38px] items-center justify-center rounded-xl"
      style={{
        background: active ? "var(--side-active)" : "transparent",
        color: active ? "var(--green-text)" : "var(--muted)",
      }}
    >
      <Icon size={18} />
      <span className="ds-rail-tip">{item.label}</span>
    </Link>
  );
}

function UserFooter({ session }: { session: SessionData }) {
  const user = session?.user;
  if (!user) return null;
  const initial = (user.name?.trim()?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
  const rawPlan = (user as { plan?: string }).plan ?? "";
  const plan = rawPlan.toLowerCase() === "pro" ? "Pro plan" : "Free plan";
  return (
    <div className="mt-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2">
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: "#0878DD" }}
      >
        {initial}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className="truncate text-[13px] font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {user.name || user.email}
        </span>
        <span className="truncate text-[11px]" style={{ color: "var(--faint)" }}>
          {plan}
        </span>
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar({
  active,
  onToggleSidebar,
  isDesktop,
}: {
  active: StudioRouteKey;
  onToggleSidebar: () => void;
  isDesktop: boolean;
}) {
  const showPrefix = active === "hub" || ["code", "sql", "mcq", "quiz"].includes(active);
  return (
    <div className="flex h-14 flex-shrink-0 items-center gap-3 px-4 sm:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={isDesktop ? "Toggle sidebar" : "Open menu"}
        title={isDesktop ? "Toggle sidebar" : "Menu"}
        className="-ml-2 inline-flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-md"
        style={{ color: "var(--muted)" }}
      >
        {isDesktop ? <PanelLeft size={16} /> : <Menu size={18} />}
      </button>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {showPrefix ? (
          <>
            <span style={{ color: "var(--faint)" }}>Create</span>
            <span style={{ color: "var(--faint)" }}>/</span>
          </>
        ) : null}
        <span
          className="truncate font-semibold"
          style={{ color: "var(--ink)" }}
        >
          {crumbFor(active)}
        </span>
      </div>
      <div className="flex-1" />
      <ThemePillToggle />
    </div>
  );
}
