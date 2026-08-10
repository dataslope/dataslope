// Navigation model for the /dashboard Studio shell: the routes the sidebar
// links to, their labels + icons, and how to map the current pathname back to
// the active entry (for highlight + breadcrumb). Kept data-only so the shell
// and any future consumer share one source of truth.
import {
  BookOpen,
  ChartSpline,
  Code2,
  Database,
  FlaskConical,
  Image,
  Layers,
  LayoutGrid,
  ListTodo,
  Mail,
  Palette,
  Shield,
  Sparkle,
  SquareTerminal,
  ThumbsUp,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

export type StudioRouteKey =
  | "hub"
  | "code"
  | "sql"
  | "mcq"
  | "quiz"
  | "playground"
  | "account"
  | "admin";

export interface StudioNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Leaves the Studio shell (its own chrome takes over). Opens in a new tab
   *  so the dashboard stays put behind it. */
  external?: boolean;
}

/** The "Create" group: the hub plus the four builders. */
export const CREATE_ITEMS: StudioNavItem[] = [
  { key: "hub", label: "My Creations", href: "/dashboard/create", icon: LayoutGrid },
  { key: "code", label: "Code Challenge", href: "/dashboard/create/challenge", icon: Code2 },
  { key: "sql", label: "SQL Challenge", href: "/dashboard/create/sql", icon: Database },
  { key: "mcq", label: "Multiple Choice", href: "/dashboard/create/mcq", icon: ListTodo },
  { key: "quiz", label: "Quiz Set", href: "/dashboard/create/quiz", icon: Layers },
];

/**
 * The "Admin" group, previously a row of tabs inside the admin pages
 * (`_components/AdminTabs.tsx`). Two bands, separated by a rule in the
 * sidebar:
 *
 *   • `data` — the account tools. Presentation-only, like every admin page:
 *     each one calls a server-authorized endpoint, so a non-admin who opens
 *     one sees an access-denied notice and never receives any data.
 *   • `tools` — the build/design surfaces that used to hang off the site
 *     footer under `next dev`. These are unauthenticated on purpose: they
 *     render generated artifacts from this repo (the brand ramps, the chart
 *     manifest, the auth email designs), not anyone's data. The one
 *     exception, Illustration Prompts, keeps its own admin gate because its
 *     corpus comes from an admin-only endpoint.
 */
export interface AdminNavItem extends StudioNavItem {
  band: "data" | "tools";
}

export const ADMIN_ITEMS: AdminNavItem[] = [
  { key: "admin-users", label: "Users", href: "/dashboard/admin", icon: Users, band: "data" },
  {
    key: "admin-test-users",
    label: "Test Users",
    href: "/dashboard/admin/test-users",
    icon: FlaskConical,
    band: "data",
  },
  {
    key: "admin-ai-usage",
    label: "AI Usage",
    href: "/dashboard/admin/ai-usage",
    icon: Sparkle,
    band: "data",
  },
  {
    key: "admin-ai-feedback",
    label: "AI Feedback",
    href: "/dashboard/admin/ai-feedback",
    icon: ThumbsUp,
    band: "data",
  },
  {
    key: "admin-charts",
    label: "Charts",
    href: "/dashboard/admin/charts",
    icon: ChartSpline,
    band: "tools",
  },
  {
    key: "admin-illustrations",
    label: "Illustration Prompts",
    href: "/dashboard/admin/illustration-prompts",
    icon: Image,
    band: "tools",
  },
  {
    key: "admin-email-preview",
    label: "Email Preview",
    href: "/dashboard/admin/email-preview",
    icon: Mail,
    band: "tools",
  },
  // Fumadocs Dev is a docs collection with its own DocsLayout sidebar, so it
  // can't nest inside this shell without stacking two navigations. It stays at
  // its own route and opens in a new tab.
  {
    key: "admin-fumadocs",
    label: "Fumadocs Dev",
    href: "/fumadocs-dev",
    icon: BookOpen,
    band: "tools",
    external: true,
  },
  // Color Palette is the brand-ramp reference rather than a place work gets
  // done, so it sits last, below the tools that are actually used in a session.
  {
    key: "admin-color-palette",
    label: "Color Palette",
    href: "/dashboard/admin/color-palette",
    icon: Palette,
    band: "tools",
  },
];

/** Standalone dashboard pages linked below the Create group. Admin is filtered
 *  by the shell. */
export const PAGE_ITEMS: StudioNavItem[] = [
  {
    key: "playground",
    label: "Playground",
    href: "/dashboard/playground",
    icon: SquareTerminal,
  },
  { key: "account", label: "Account", href: "/dashboard/account", icon: User },
  { key: "admin", label: "Admin", href: "/dashboard/admin", icon: Shield },
];

const ALL_ITEMS = [...CREATE_ITEMS, ...PAGE_ITEMS];

/** Human breadcrumb label for a route key. */
export function crumbFor(key: StudioRouteKey): string {
  return ALL_ITEMS.find((i) => i.key === key)?.label ?? "My Creations";
}

/** The builder routes (used for "Create / …" breadcrumb prefix + AI panel). */
export const BUILDER_KEYS: StudioRouteKey[] = ["code", "sql", "mcq", "quiz"];

/**
 * Resolve the active route key from a pathname. Longest-prefix match so
 * `/create/challenge?edit=…` still lights up Code Challenge, and `/create`
 * exactly is the hub.
 */
export function activeKeyForPath(pathname: string): StudioRouteKey {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard/create") return "hub";
  if (path.startsWith("/dashboard/create/challenge")) return "code";
  if (path.startsWith("/dashboard/create/sql")) return "sql";
  if (path.startsWith("/dashboard/create/mcq")) return "mcq";
  if (path.startsWith("/dashboard/create/quiz")) return "quiz";
  if (path.startsWith("/dashboard/playground")) return "playground";
  if (path.startsWith("/dashboard/account")) return "account";
  if (path.startsWith("/dashboard/admin")) return "admin";
  return "hub";
}

/** The admin sub-item a pathname is on, or null. `/dashboard/admin` is the
 *  Users page, so it only matches exactly; every other entry also claims its
 *  nested routes. */
export function activeAdminItem(pathname: string): AdminNavItem | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/dashboard/admin") return ADMIN_ITEMS[0];
  return (
    ADMIN_ITEMS.find(
      (i) => !i.external && i.href !== "/dashboard/admin" && path.startsWith(i.href),
    ) ?? null
  );
}

/** Breadcrumb tail for an admin route: "Admin / Test Users". */
export function adminCrumbFor(pathname: string): string | null {
  return activeAdminItem(pathname)?.label ?? null;
}
