"use client";

/**
 * The /dashboard "Studio" shell: a persistent sidebar + top bar that wraps the
 * hub and every builder (rendered by app/dashboard/layout.tsx). Ported from
 * the Create Studio design handoff. The active nav item + breadcrumb come
 * from the pathname, so the shell stays mounted across navigations while the
 * content (children) swaps.
 *
 * Sidebar behavior mirrors the design's breakpoints exactly:
 *   - wide viewports: the full 264px sidebar, collapsible to the icon rail;
 *   - below 900px (or 1240px while a builder shows its live preview): the
 *     rail, with the toggle opening the full sidebar as a drawer overlay;
 *   - below 640px: no rail; a hamburger opens the drawer.
 *
 * The sidebar paints no background of its own (the design's classic variant
 * is transparent over the page) — only the drawer overlay gets the elevated
 * main background + shadow.
 *
 * Theme flips via the site-wide ThemePillToggle (siteTheme.ts); colors resolve
 * from the scoped tokens in studio.css.
 */

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  ExternalLink,
  Eye,
  LogIn,
  LogOut,
  Maximize,
  Menu,
  Minimize,
  PanelLeft,
  Plus,
  Shield,
} from "lucide-react";
import { signOut, useSession } from "@/lib/auth/client";
import { ThemePillToggle } from "@/app/_components/ThemePillToggle";
import {
  activeAdminItem,
  activeKeyForPath,
  adminCrumbFor,
  ADMIN_ITEMS,
  BUILDER_KEYS,
  CREATE_ITEMS,
  crumbFor,
  PAGE_ITEMS,
  type StudioNavItem,
  type StudioRouteKey,
} from "./nav";
import { useViewportWidth } from "./useViewportWidth";
import { StudioAiPanel } from "./StudioAiPanel";
import { useStudioPreview } from "./StudioPreviewContext";

export function StudioShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/dashboard/create";
  const active = activeKeyForPath(pathname);
  const isBuilder = BUILDER_KEYS.includes(active);
  const { data: session } = useSession();
  const { previewOpen } = useStudioPreview();

  const winW = useViewportWidth();
  // While a builder shows its side-by-side preview the content needs more
  // room, so the sidebar gives way to the rail earlier (design's narrowLimit).
  const narrowLimit = isBuilder && previewOpen ? 1240 : 900;
  const isPhone = winW < 640;
  const isNarrow = winW < narrowLimit;

  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(true);
  // Eight entries, only relevant while you're in there: the Admin group starts
  // open on an admin route and closed everywhere else, where Create is the
  // group that matters.
  const [adminOpen, setAdminOpen] = useState(active === "admin");

  // Resizing back to a wide layout dismisses a left-over drawer (the inline
  // sidebar takes over), mirroring the design's resize handler. Adjusted
  // during render (not in an effect) per the React "adjust state when a prop
  // changes" pattern.
  const [wasNarrow, setWasNarrow] = useState(isNarrow);
  if (wasNarrow !== isNarrow) {
    setWasNarrow(isNarrow);
    if (!isNarrow) setDrawerOpen(false);
  }

  const showFullSidebar = !isPhone && !isNarrow && !collapsed;
  const showRail = !isPhone && !showFullSidebar;

  // `role`/`plan` are auth additionalFields, not on the inferred client
  // session type, so read them the way AccountClient does (a cast).
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === "admin";
  // The Admin group also carries the build/design tools that used to hang off
  // the footer under `next dev` (color ramps, chart gallery, email designs).
  // Those need no session, so on localhost the group is always reachable —
  // otherwise moving them here would have hidden them from exactly the people
  // who use them. Deployed, it stays admin-only. The data pages inside are
  // gated server-side either way; this only decides what the sidebar offers.
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
          createOpen={createOpen}
          onToggleCreate={() => setCreateOpen((o) => !o)}
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
            createOpen={createOpen}
            onToggleCreate={() => setCreateOpen((o) => !o)}
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
          isBuilder={isBuilder}
          onToggleSidebar={toggleSidebar}
          isPhone={isPhone}
        />
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1280px] px-3.5 pb-16 pt-3.5 sm:px-4 sm:pb-[72px] sm:pt-[18px] min-[900px]:px-8 min-[900px]:pb-24 min-[900px]:pt-7">
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
  pathname,
  createOpen,
  onToggleCreate,
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
  createOpen: boolean;
  onToggleCreate: () => void;
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
        <button
          type="button"
          onClick={onToggleCreate}
          className="ds-nav-item w-full text-left"
          style={{ border: "none", background: "transparent" }}
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
            className="mb-1 ml-[18px] mt-0.5 flex flex-col gap-0.5 pl-[9px]"
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
                  // The parent stays lit while a child is active, so a
                  // collapsed group still shows where you are.
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
                        tools, which are a different kind of thing (and a
                        different auth story, see nav.ts). */}
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
      // An entry that leaves the shell (Fumadocs Dev brings its own docs
      // chrome) opens beside the dashboard rather than replacing it.
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
  // The rail is icons only, so the Admin group collapses back to its single
  // parent entry; opening it lands on Users and the full sidebar takes over
  // from there.
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
      <div
        className="flex flex-col gap-0.5 rounded-2xl p-1"
        style={{ background: "var(--rail-group)" }}
      >
        {CREATE_ITEMS.map((item) => (
          <RailLink key={item.key} item={item} active={active === item.key} />
        ))}
      </div>
      <div className="mt-1 flex flex-col gap-0.5">
        {railItems.map((item) => (
          <RailLink key={item.key} item={item} active={active === item.key} />
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
  const { isPending } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const user = session?.user;
  // Signed out: a quiet sign-in row where the account card would sit. Nothing
  // while the first session read is in flight, so a signed-in visitor doing a
  // full-page load doesn't see "Sign in" flash before their account appears.
  if (!user) {
    if (isPending) return null;
    return (
      <Link href="/sign-in" className="ds-nav-item mt-1">
        <LogIn size={17} style={{ color: "var(--muted)" }} />
        Sign in
      </Link>
    );
  }
  const initial = (user.name?.trim()?.[0] ?? user.email?.[0] ?? "?").toUpperCase();
  const rawPlan = (user as { plan?: string }).plan ?? "";
  const plan = rawPlan.toLowerCase() === "pro" ? "Pro plan" : "Free plan";

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
  isBuilder,
  onToggleSidebar,
  isPhone,
}: {
  active: StudioRouteKey;
  pathname: string;
  isBuilder: boolean;
  onToggleSidebar: () => void;
  isPhone: boolean;
}) {
  const showPrefix = active === "hub" || isBuilder;
  // Admin sections used to be a tab row inside the page. Now that they're
  // sidebar children, the breadcrumb is what names the section: "Admin / AI
  // Usage".
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
        {showPrefix ? (
          <>
            <span style={{ color: "var(--faint)" }}>Create</span>
            <span style={{ color: "var(--faint)" }}>/</span>
          </>
        ) : null}
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
      {isBuilder ? <PreviewControls /> : null}
      <ThemePillToggle />
    </div>
  );
}

/** The "Live Preview" switch + full-preview expand button (builders only). */
function PreviewControls() {
  const { previewOpen, fullPreview, togglePreview, toggleFullPreview } =
    useStudioPreview();
  return (
    <>
      <button
        type="button"
        onClick={togglePreview}
        role="switch"
        aria-checked={previewOpen}
        title="Show or hide live preview"
        className="flex h-[34px] items-center gap-2 rounded-[7px] border-none bg-transparent px-1.5 transition-colors hover:bg-[var(--panel)]"
      >
        <span
          className="inline-flex items-center gap-1.5 text-[13px] font-medium"
          style={{ color: "var(--muted)" }}
        >
          <Eye size={14} />
          <span className="hidden sm:inline">Live Preview</span>
        </span>
        <span
          className="relative inline-flex h-5 w-[34px] flex-shrink-0 rounded-full transition-colors"
          style={{
            background: previewOpen ? "var(--green-btn)" : "rgba(120,120,128,0.32)",
          }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-[left]"
            style={{
              left: previewOpen ? 16 : 2,
              boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
            }}
          />
        </span>
      </button>
      <button
        type="button"
        onClick={toggleFullPreview}
        title={fullPreview ? "Exit full preview" : "Full preview"}
        aria-label={fullPreview ? "Exit full preview" : "Full preview"}
        data-active={fullPreview || undefined}
        className="ds-topbar-btn"
      >
        {fullPreview ? <Minimize size={15} /> : <Maximize size={15} />}
      </button>
    </>
  );
}
