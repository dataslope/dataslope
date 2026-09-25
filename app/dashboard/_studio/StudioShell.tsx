"use client";

/**
 * The /dashboard "Studio" shell: persistent sidebar + top bar wrapping every
 * dashboard page. Active nav/breadcrumb derive from the pathname, so the
 * shell stays mounted across navigations. Breakpoints: full 264px sidebar on
 * wide viewports; icon rail below 900px; hamburger + drawer below 640px.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  LogIn,
  LogOut,
  Menu,
  PanelLeft,
  Shield,
} from "lucide-react";
import { isSessionUnavailable, signOut, useSession } from "@/lib/auth/client";
import { SessionUnavailable } from "@/app/_components/auth/SessionUnavailable";
import { effectivePlan, isAdminUser, type PlanUser } from "@/lib/plan";
import { ThemePillToggle } from "@/app/_components/ThemePillToggle";
import {
  activeAdminItem,
  activeKeyForPath,
  adminCrumbFor,
  ADMIN_ITEMS,
  crumbFor,
  PAGE_ITEMS,
  SITE_ITEMS,
  type StudioNavItem,
  type StudioRouteKey,
} from "./nav";
import { useViewportWidth } from "./useViewportWidth";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/dashboard/challenges";
  const active = activeKeyForPath(pathname);
  const { data: session } = useSession();

  const winW = useViewportWidth();
  const narrowLimit = 900;
  const isPhone = winW < 640;
  const isNarrow = winW < narrowLimit;

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // The Admin group starts open only on an admin route.
  const [adminOpen, setAdminOpen] = useState(active === "admin");

  // Resizing back to a wide layout dismisses a left-over drawer. Adjusted
  // during render per the React "adjust state when a prop changes" pattern.
  const [wasNarrow, setWasNarrow] = useState(isNarrow);
  if (wasNarrow !== isNarrow) {
    setWasNarrow(isNarrow);
    if (!isNarrow) setDrawerOpen(false);
  }

  const showFullSidebar = !isPhone && !isNarrow && !collapsed;
  const showRail = !isPhone && !showFullSidebar;

  // `role` is an auth additionalField, not on the inferred client session type.
  const isAdmin = isAdminUser(session?.user as PlanUser | undefined);
  // On localhost the Admin group is always reachable (it carries sessionless
  // build/design tools); deployed it stays admin-only. Data pages inside are
  // gated server-side either way — this only decides what the sidebar offers.
  const showAdmin = isAdmin || process.env.NODE_ENV === "development";
  const pageItems = PAGE_ITEMS.filter((i) => i.key !== "admin");

  const toggleSidebar = () => {
    if (isNarrow || isPhone) setDrawerOpen((o) => !o);
    else setCollapsed((c) => !c);
  };
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div
      className="ds-studio flex h-screen overflow-hidden"
      style={{ background: "var(--page-bg)", color: "var(--text)" }}
    >
      {/* Drawer backdrop */}
      {drawerOpen ? (
        <div
          onClick={closeDrawer}
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.35)" }}
          aria-hidden="true"
        />
      ) : null}

      {/* Inline sidebar: full or rail */}
      {showFullSidebar ? (
        <FullSidebar
          active={active}
          pathname={pathname}
          adminOpen={adminOpen}
          onToggleAdmin={() => setAdminOpen((o) => !o)}
          showAdmin={showAdmin}
          pageItems={pageItems}
          session={session}
        />
      ) : null}
      {showRail ? (
        <RailSidebar
          active={active}
          pageItems={pageItems}
          showAdmin={showAdmin}
          session={session}
        />
      ) : null}

      {/* Drawer sidebar (narrow + phone) */}
      {drawerOpen ? (
        <div className="fixed inset-y-0 left-0 z-50">
          <FullSidebar
            active={active}
            pathname={pathname}
            adminOpen={adminOpen}
            onToggleAdmin={() => setAdminOpen((o) => !o)}
            showAdmin={showAdmin}
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
        <TopBar
          active={active}
          pathname={pathname}
          onToggleSidebar={toggleSidebar}
          isPhone={isPhone}
        />
        {/* The site-wide "Skip to main content" link targets #main, and the
            studio shell had neither the id nor a <main> landmark — so the
            skip link was focusable and did nothing on every dashboard page. */}
        <main id="main" className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1280px] px-3.5 pb-16 pt-3.5 sm:px-4 sm:pb-[72px] sm:pt-[18px] min-[900px]:px-8 min-[900px]:pb-24 min-[900px]:pt-7">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebars
// ---------------------------------------------------------------------------

type SessionData = ReturnType<typeof useSession>["data"];

function FullSidebar({
  active,
  pathname,
  adminOpen,
  onToggleAdmin,
  showAdmin,
  pageItems,
  session,
  onNavigate,
  elevated,
}: {
  active: StudioRouteKey;
  pathname: string;
  adminOpen: boolean;
  onToggleAdmin: () => void;
  showAdmin: boolean;
  pageItems: StudioNavItem[];
  session: SessionData;
  onNavigate?: () => void;
  elevated?: boolean;
}) {
  const activeAdmin = activeAdminItem(pathname);
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
        href="/"
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
        {pageItems.map((item) => (
          <NavLink
            key={item.key}
            item={item}
            active={active === item.key}
            onNavigate={onNavigate}
          />
        ))}

        {showAdmin ? (
          <>
            <button
              type="button"
              onClick={onToggleAdmin}
              aria-expanded={adminOpen}
              className="ds-nav-item w-full text-left font-medium"
              style={{ border: "none", background: "transparent" }}
            >
              <Shield
                size={17}
                style={{
                  // Parent stays lit while a child is active.
                  color: active === "admin" ? "var(--green-text)" : "var(--muted)",
                }}
              />
              Admin
              <ChevronRight
                size={14}
                className="ml-auto transition-transform"
                style={{
                  color: "var(--faint)",
                  transform: adminOpen ? "rotate(90deg)" : "none",
                }}
              />
            </button>

            {adminOpen ? (
              <div
                className="mb-1 ml-[18px] mt-0.5 flex flex-col gap-0.5 pl-[9px]"
                style={{ borderLeft: "1px solid var(--divider)" }}
              >
                {ADMIN_ITEMS.map((item, i) => (
                  <div key={item.key} className="contents">
                    {/* Hairline between the account tools and the build/design
                        tools (different auth story, see nav.ts). */}
                    {i > 0 && item.band !== ADMIN_ITEMS[i - 1].band ? (
                      <span
                        aria-hidden="true"
                        className="my-1 ml-1 block h-px"
                        style={{ background: "var(--divider)" }}
                      />
                    ) : null}
                    <NavLink
                      item={item}
                      active={activeAdmin?.key === item.key}
                      onNavigate={onNavigate}
                      small
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}

        <span
          aria-hidden="true"
          className="mx-2.5 my-2 block h-px"
          style={{ background: "var(--divider)" }}
        />
        {SITE_ITEMS.map((item) => (
          <NavLink key={item.key} item={item} active={false} onNavigate={onNavigate} />
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
      // Entries that leave the shell open in a new tab.
      {...(item.external ? { target: "_blank", rel: "noreferrer" } : {})}
      aria-current={active ? "page" : undefined}
      data-active={active || undefined}
      className={`ds-nav-item font-medium ${small ? "ds-nav-sub" : ""}`}
    >
      <Icon
        size={17}
        className="flex-shrink-0"
        style={{ color: active ? "var(--green-text)" : "var(--muted)" }}
      />
      {item.label}
      {item.external ? (
        <ExternalLink size={12} className="ml-auto" style={{ color: "var(--faint)" }} />
      ) : null}
    </Link>
  );
}

function RailSidebar({
  active,
  pageItems,
  showAdmin,
  session,
}: {
  active: StudioRouteKey;
  pageItems: StudioNavItem[];
  showAdmin: boolean;
  session: SessionData;
}) {
  // Icons only, so the Admin group collapses to its single parent entry.
  const railItems = showAdmin
    ? [...pageItems, ...PAGE_ITEMS.filter((i) => i.key === "admin")]
    : pageItems;
  const user = session?.user;
  const initial = (user?.name?.trim()?.[0] ?? user?.email?.[0] ?? "").toUpperCase();
  return (
    <aside
      aria-label="Studio navigation"
      className="flex w-16 flex-shrink-0 flex-col items-center gap-1 pb-3 pt-4"
    >
      <Link
        href="/"
        title="Dataslope"
        className="mb-3.5 flex h-10 w-10 items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/dataslope-logo-blue.svg" alt="Dataslope" className="h-[15px] w-auto" />
      </Link>
      <div className="flex flex-col gap-0.5">
        {railItems.map((item) => (
          <RailLink key={item.key} item={item} active={active === item.key} />
        ))}
        <span
          aria-hidden="true"
          className="mx-auto my-1.5 block h-px w-6"
          style={{ background: "var(--divider)" }}
        />
        {SITE_ITEMS.map((item) => (
          <RailLink key={item.key} item={item} active={false} />
        ))}
      </div>
      <div className="flex-1" />
      {user ? (
        <span
          title={user.email ?? undefined}
          className="mt-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ background: "#0878DD" }}
        >
          {initial}
        </span>
      ) : (
        <Link
          href="/sign-in"
          aria-label="Sign in"
          className="ds-rail-item mt-1.5 flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
          style={{ color: "var(--muted)" }}
        >
          <LogIn size={17} />
          <span className="ds-rail-tip">Sign in</span>
        </Link>
      )}
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
      className="ds-rail-item flex h-[38px] w-[38px] items-center justify-center rounded-[11px]"
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
  const router = useRouter();
  const { isPending, error } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user;
  // Nothing while the first session read is in flight, so a signed-in visitor
  // doesn't see "Sign in" flash before their account appears.
  if (!user) {
    if (isPending) return null;
    if (isSessionUnavailable(error)) return <SessionUnavailable compact />;
    return (
      <Link href="/sign-in" className="ds-nav-item mt-1">
        <LogIn size={17} style={{ color: "var(--muted)" }} />
        Sign in
      </Link>
    );
  }
  const initial = (user.name?.trim()?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
  // Same rule as the account page and the pricing CTAs, so an admin is not
  // "Free plan" here and "Pro (admin)" there.
  const plan = effectivePlan(user as PlanUser) === "pro" ? "Pro plan" : "Free plan";

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      // Re-render anything reading the session; the footer collapses to null.
      router.refresh();
    } catch {
      // Network failure: leave the session as-is; the button re-enables.
    }
    setSigningOut(false);
  };

  return (
    <div className="mt-1 flex items-center gap-2.5 rounded-xl px-2.5 py-2">
      <span
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: "#0878DD" }}
      >
        {initial}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
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
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        aria-label="Sign out"
        title="Sign out"
        className="inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--chip-hover)] disabled:opacity-50"
        style={{ color: "var(--muted)" }}
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top bar
// ---------------------------------------------------------------------------

function TopBar({
  active,
  pathname,
  onToggleSidebar,
  isPhone,
}: {
  active: StudioRouteKey;
  pathname: string;
  onToggleSidebar: () => void;
  isPhone: boolean;
}) {
  // The breadcrumb names the admin section: "Admin / Test Users".
  const adminCrumb = active === "admin" ? adminCrumbFor(pathname) : null;
  return (
    <div className="flex h-14 flex-shrink-0 items-center gap-3 px-2 sm:px-3.5 min-[900px]:px-6">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-label={isPhone ? "Open menu" : "Toggle sidebar"}
        title={isPhone ? "Menu" : "Toggle sidebar"}
        className="ds-topbar-btn -ml-2"
      >
        {isPhone ? <Menu size={18} /> : <PanelLeft size={16} />}
      </button>
      <div className="flex min-w-0 items-center gap-2 text-sm">
        {adminCrumb ? (
          <>
            <span style={{ color: "var(--faint)" }}>{crumbFor(active)}</span>
            <span style={{ color: "var(--faint)" }}>/</span>
            <span className="truncate font-semibold" style={{ color: "var(--ink)" }}>
              {adminCrumb}
            </span>
          </>
        ) : (
          <span className="truncate font-semibold" style={{ color: "var(--ink)" }}>
            {crumbFor(active)}
          </span>
        )}
      </div>
      <div className="flex-1" />
      <ThemePillToggle />
    </div>
  );
}

