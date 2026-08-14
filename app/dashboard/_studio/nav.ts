// Data-only navigation model for the /dashboard Studio shell: sidebar routes,
// labels + icons, and pathname → active-entry mapping.
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
  /** Leaves the Studio shell; opens in a new tab. */
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
 * The "Admin" group, in two bands: `data` — account tools whose endpoints are
 * server-authorized, so non-admins never receive data; `tools` — build/design
 * surfaces that are unauthenticated on purpose (they render generated repo
 * artifacts, not anyone's data), except Illustration Prompts, whose corpus
 * comes from an admin-only endpoint.
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
  // Fumadocs Dev brings its own DocsLayout sidebar, so it opens in a new tab
  // rather than nesting two navigations.
  {
    key: "admin-fumadocs",
    label: "Fumadocs Dev",
    href: "/fumadocs-dev",
    icon: BookOpen,
    band: "tools",
    external: true,
  },
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
