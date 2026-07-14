// Navigation model for the /create Studio shell: the routes the sidebar links
// to, their labels + icons, and how to map the current pathname back to the
// active entry (for highlight + breadcrumb). Kept data-only so the shell and
// any future consumer share one source of truth.
import {
  Code2,
  Database,
  Layers,
  LayoutGrid,
  ListTodo,
  SquareTerminal,
  User,
  Shield,
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
  key: StudioRouteKey;
  label: string;
  href: string;
  icon: LucideIcon;
}

/** The "Create" group: the hub plus the four builders. */
export const CREATE_ITEMS: StudioNavItem[] = [
  { key: "hub", label: "My Creations", href: "/dashboard/create", icon: LayoutGrid },
  { key: "code", label: "Code Challenge", href: "/dashboard/create/challenge", icon: Code2 },
  { key: "sql", label: "SQL Challenge", href: "/dashboard/create/sql", icon: Database },
  { key: "mcq", label: "Multiple Choice", href: "/dashboard/create/mcq", icon: ListTodo },
  { key: "quiz", label: "Quiz Set", href: "/dashboard/create/quiz", icon: Layers },
];

/** Standalone dashboard pages linked below the Create group. Admin is filtered
 *  to admins by the shell. */
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
