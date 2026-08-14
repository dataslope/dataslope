"use client";

/**
 * Users section of the admin dashboard: list, plan-switch, impersonate, ban,
 * remove. Authorization is server-side — every `authClient.admin.*` call hits
 * a Better Auth endpoint that rejects non-admins — so this stays a statically
 * prerendered client component. "Remove" hard-deletes (cascades to sessions +
 * accounts, frees the email); "Ban" blocks sign-in but keeps the row.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRightLeft,
  Ban,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  VenetianMask,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AccessDeniedCard,
  AdminPageHeader,
  CenteredNote,
  ErrorNote,
  Panel,
  PanelBody,
  PanelHeader,
  PlanBadge,
  SignInPrompt,
  StatusBadge,
  cellClass,
  dangerActionClass,
  formatJoined,
  headRowClass,
  impersonateUser,
  isImpersonatedSession,
  isTestEmail,
  quietActionClass,
  rowClass,
  setUserPlan,
  softInputClass,
  theadClass,
} from "./_components/shared";

/** Subset of the Better Auth admin `listUsers` row we render. */
interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  plan?: string | null;
  banned?: boolean | null;
  createdAt: string | Date;
}

/** Page size for the browse list and cap per search request. */
const LIST_LIMIT = 200;

const SEARCH_DEBOUNCE_MS = 300;

export function UsersClient() {
  const { data: session, isPending: sessionPending } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  // Server-reported total; `users.length` alone under-reports.
  const [total, setTotal] = useState(0);
  const [searchTruncated, setSearchTruncated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState("");
  // User-id with an action mid-flight / with a pending "confirm remove".
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  // Monotonic sequence: a slow stale response must not overwrite a newer one.
  const loadSeq = useRef(0);

  /** Load the browse page or search results. Search runs SERVER-side (a
   *  client-side filter would hide accounts older than the newest LIST_LIMIT).
   *  The endpoint searches one field per request, so a query fans out to
   *  email + name and merges. */
  const loadUsers = useCallback(async (search: string) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const q = search.trim();
      const baseQuery = {
        limit: LIST_LIMIT,
        sortBy: "createdAt",
        sortDirection: "desc" as const,
      };
      const responses = q
        ? await Promise.all(
            (["email", "name"] as const).map((searchField) =>
              authClient.admin.listUsers({
                query: {
                  ...baseQuery,
                  searchValue: q,
                  searchField,
                  searchOperator: "contains" as const,
                },
              }),
            ),
          )
        : [await authClient.admin.listUsers({ query: baseQuery })];
      if (seq !== loadSeq.current) return; // superseded by a newer load

      const failed = responses.find((r) => r.error)?.error;
      if (failed) {
        // 401/403 means "signed in but not an admin", show a distinct notice.
        if (failed.status === 401 || failed.status === 403) {
          setDenied(true);
        } else {
          setError(failed.message ?? "Couldn't load users. Please try again.");
        }
        setUsers([]);
        setTotal(0);
        setSearchTruncated(false);
      } else if (q) {
        const seen = new Set<string>();
        const merged: AdminUser[] = [];
        for (const r of responses) {
          for (const u of (r.data?.users ?? []) as AdminUser[]) {
            if (!seen.has(u.id)) {
              seen.add(u.id);
              merged.push(u);
            }
          }
        }
        merged.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setUsers(merged);
        setTotal(merged.length);
        // Either field maxing out its page means matches were left behind.
        setSearchTruncated(
          responses.some((r) => (r.data?.users?.length ?? 0) >= LIST_LIMIT),
        );
      } else {
        const { data } = responses[0];
        setUsers((data?.users ?? []) as AdminUser[]);
        setTotal(data?.total ?? 0);
        setSearchTruncated(false);
      }
    } catch {
      if (seq !== loadSeq.current) return;
      setError("Couldn't reach the server. Please try again.");
      setUsers([]);
      setTotal(0);
    }
    if (seq === loadSeq.current) setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch once a session is confirmed. Search input re-runs this, debounced;
    // the empty query fires at once.
    if (sessionPending || !session) return;
    const timer = setTimeout(
      () => void loadUsers(query),
      query.trim() ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => clearTimeout(timer);
  }, [sessionPending, session, loadUsers, query]);

  /** Append the next browse page (search results are single-shot). */
  async function handleLoadMore() {
    setLoadingMore(true);
    setError(null);
    try {
      const { data, error: listError } = await authClient.admin.listUsers({
        query: {
          limit: LIST_LIMIT,
          offset: users.length,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });
      if (listError) {
        setError(listError.message ?? "Couldn't load more users.");
      } else {
        setUsers((prev) => {
          const seen = new Set(prev.map((u) => u.id));
          const fresh = ((data?.users ?? []) as AdminUser[]).filter(
            (u) => !seen.has(u.id),
          );
          return [...prev, ...fresh];
        });
        setTotal(data?.total ?? 0);
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setLoadingMore(false);
  }

  async function handleRemove(userId: string) {
    setBusyId(userId);
    setError(null);
    try {
      const { error: removeError } = await authClient.admin.removeUser({
        userId,
      });
      if (removeError) {
        setError(removeError.message ?? "Couldn't remove that user.");
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setTotal((t) => Math.max(0, t - 1));
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setBusyId(null);
    setConfirmId(null);
  }

  async function handleToggleBan(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const { error: banError } = user.banned
        ? await authClient.admin.unbanUser({ userId: user.id })
        : await authClient.admin.banUser({ userId: user.id });
      if (banError) {
        setError(banError.message ?? "Couldn't update that user.");
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, banned: !user.banned } : u,
          ),
        );
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setBusyId(null);
  }

  async function handleTogglePlan(user: AdminUser) {
    const next = (user.plan ?? "").toLowerCase() === "pro" ? "free" : "pro";
    setBusyId(user.id);
    setError(null);
    const planError = await setUserPlan(user.id, next);
    if (planError) {
      setError(planError);
    } else {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, plan: next } : u)),
      );
    }
    setBusyId(null);
  }

  async function handleToggleRole(user: AdminUser) {
    const next = user.role === "admin" ? "user" : "admin";
    setBusyId(user.id);
    setError(null);
    try {
      const { error: roleError } = await authClient.admin.setRole({
        userId: user.id,
        role: next,
      });
      if (roleError) {
        setError(roleError.message ?? "Couldn't change that user's role.");
      } else {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: next } : u)),
        );
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setBusyId(null);
  }

  async function handleImpersonate(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    const impError = await impersonateUser(user.id);
    // On success the browser navigates away; we only get here on failure.
    if (impError) setError(impError);
    setBusyId(null);
  }

  // --- Row pieces shared by the desktop table and the mobile card list ----

  const renderIdentity = (user: AdminUser, isSelf: boolean) => (
    <div className="flex min-w-0 items-center gap-3">
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={user.image}
          alt=""
          aria-hidden="true"
          className="size-8 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
        >
          {(user.name?.trim()?.[0] ?? "?").toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        {/* Badges sit outside the truncating span so a long name can't
            swallow them. */}
        <div className="flex min-w-0 items-center gap-2 font-medium">
          <span className="truncate">{user.name || "—"}</span>
          {isSelf && (
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              (you)
            </span>
          )}
          {isTestEmail(user.email) && (
            <Badge variant="secondary" className="shrink-0">
              Test
            </Badge>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {user.email}
        </div>
      </div>
    </div>
  );

  const renderPlan = (user: AdminUser, isBusy: boolean) => (
    <div className="flex items-center gap-1">
      <PlanBadge plan={user.plan} />
      <Button
        variant="ghost"
        size="icon"
        className={`size-7 ${quietActionClass}`}
        onClick={() => void handleTogglePlan(user)}
        disabled={isBusy}
        title={
          (user.plan ?? "").toLowerCase() === "pro"
            ? "Switch to free"
            : "Switch to pro"
        }
      >
        <ArrowRightLeft className="size-3.5" />
        <span className="sr-only">Switch plan</span>
      </Button>
    </div>
  );

  // Role display + toggle. The ADMIN_EMAILS/ADMIN_USER_IDS allowlists only
  // ever *grant* (re-promoted at next sign-in), so revoking means demoting
  // here AND removing from the env list. Self is excluded to avoid lock-out.
  const renderRole = (user: AdminUser, isSelf: boolean, isBusy: boolean) => (
    <div className="flex items-center gap-1">
      {user.role === "admin" ? (
        <Badge className="border-transparent bg-[var(--ds-blue-600)]/10 text-[var(--ds-blue-600)] dark:bg-white/10 dark:text-white">
          <ShieldCheck />
          Admin
        </Badge>
      ) : (
        <span className="text-sm text-muted-foreground">User</span>
      )}
      {!isSelf && (
        <Button
          variant="ghost"
          size="icon"
          className={`size-7 ${quietActionClass}`}
          onClick={() => void handleToggleRole(user)}
          disabled={isBusy}
          title={
            user.role === "admin"
              ? "Demote to regular user"
              : "Grant admin access"
          }
        >
          <ArrowRightLeft className="size-3.5" />
          <span className="sr-only">Toggle role</span>
        </Button>
      )}
    </div>
  );

  const renderActions = (
    user: AdminUser,
    isSelf: boolean,
    isAdminRow: boolean,
    isBusy: boolean,
  ) => {
    if (isSelf) {
      return (
        <span className="text-xs text-muted-foreground">Manage elsewhere</span>
      );
    }
    if (confirmId === user.id) {
      return (
        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          <span className="text-xs text-muted-foreground">Remove?</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => void handleRemove(user.id)}
            disabled={isBusy}
          >
            {isBusy ? <Loader2 className="animate-spin" /> : "Yes, remove"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmId(null)}
            disabled={isBusy}
          >
            Cancel
          </Button>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap items-center gap-1 md:flex-nowrap">
        {!isAdminRow && (
          <Button
            variant="ghost"
            size="sm"
            className={quietActionClass}
            onClick={() => void handleImpersonate(user)}
            disabled={isBusy}
            title="Browse the site as this user (come back to /admin to stop)"
          >
            <VenetianMask />
            Impersonate
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className={quietActionClass}
          onClick={() => void handleToggleBan(user)}
          disabled={isBusy}
          title={
            user.banned ? "Lift the ban" : "Block sign-in (keeps the account)"
          }
        >
          {user.banned ? <ShieldCheck /> : <Ban />}
          {user.banned ? "Unban" : "Ban"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={dangerActionClass}
          onClick={() => setConfirmId(user.id)}
          disabled={isBusy}
          title="Delete the account (frees the email for re-signup)"
        >
          <Trash2 />
          Remove
        </Button>
      </div>
    );
  };

  // --- Gating states -------------------------------------------------------

  if (sessionPending) {
    return <CenteredNote>Loading…</CenteredNote>;
  }

  if (!session) {
    return <SignInPrompt />;
  }

  if (denied) {
    return (
      <AccessDeniedCard
        email={session.user.email}
        impersonated={isImpersonatedSession(session)}
      />
    );
  }

  // --- Dashboard -----------------------------------------------------------

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Manage user accounts, plans, and access."
      />
      <Panel>
        <PanelHeader
          title="All users"
          description={
            loading
              ? "Loading users…"
              : query.trim()
                ? `${users.length} ${users.length === 1 ? "match" : "matches"}${
                    searchTruncated
                      ? " (more exist, narrow the search)"
                      : ""
                  }`
                : users.length < total
                  ? `Showing ${users.length} of ${total} accounts`
                  : `${total} ${total === 1 ? "account" : "accounts"}`
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              className={quietActionClass}
              onClick={() => void loadUsers(query)}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : undefined} />
              Refresh
            </Button>
          }
        />

        <PanelBody className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by name or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${softInputClass} pl-9`}
              aria-label="Search users"
            />
          </div>

          {error && <ErrorNote>{error}</ErrorNote>}

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline size-4 animate-spin" />
              Loading…
            </p>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "No users match your search."
                : "No users yet."}
            </p>
          ) : (
            <>
              {/* Desktop: table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className={headRowClass}>
                      <TableHead className={theadClass}>User</TableHead>
                      <TableHead className={theadClass}>Plan</TableHead>
                      <TableHead className={theadClass}>Role</TableHead>
                      <TableHead className={theadClass}>Status</TableHead>
                      <TableHead className={theadClass}>Joined</TableHead>
                      <TableHead className={`${theadClass} text-right`}>
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isSelf = user.id === session.user.id;
                      const isAdminRow = user.role === "admin";
                      const isBusy = busyId === user.id;
                      return (
                        <TableRow key={user.id} className={rowClass}>
                          {/* w-full + max-w-0: take leftover width, still truncate. */}
                          <TableCell className={`${cellClass} w-full max-w-0`}>
                            {renderIdentity(user, isSelf)}
                          </TableCell>
                          <TableCell className={cellClass}>
                            {renderPlan(user, isBusy)}
                          </TableCell>
                          <TableCell className={cellClass}>
                            {renderRole(user, isSelf, isBusy)}
                          </TableCell>
                          <TableCell className={cellClass}>
                            <StatusBadge banned={user.banned} />
                          </TableCell>
                          <TableCell
                            className={`${cellClass} text-muted-foreground`}
                          >
                            {formatJoined(user.createdAt)}
                          </TableCell>
                          <TableCell className={`${cellClass} text-right`}>
                            <div className="flex justify-end">
                              {renderActions(user, isSelf, isAdminRow, isBusy)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: stacked cards */}
              <ul className="md:hidden">
                {users.map((user) => {
                  const isSelf = user.id === session.user.id;
                  const isAdminRow = user.role === "admin";
                  const isBusy = busyId === user.id;
                  return (
                    <li
                      key={user.id}
                      className="flex flex-col gap-2.5 border-b border-zinc-500/[0.07] py-4 first:pt-1 last:border-b-0 last:pb-1 dark:border-white/[0.05]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        {renderIdentity(user, isSelf)}
                        {renderPlan(user, isBusy)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {renderRole(user, isSelf, isBusy)}
                        <StatusBadge banned={user.banned} />
                        <span>Joined {formatJoined(user.createdAt)}</span>
                      </div>
                      <div className="-ml-2">
                        {renderActions(user, isSelf, isAdminRow, isBusy)}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Browse mode pages through; search is single-shot. */}
              {!query.trim() && users.length < total && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`${quietActionClass} self-center`}
                  onClick={() => void handleLoadMore()}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    `Load ${Math.min(LIST_LIMIT, total - users.length)} more`
                  )}
                </Button>
              )}
            </>
          )}

          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="font-medium text-foreground">Remove</strong>{" "}
            permanently deletes the account and all its sessions, freeing the
            email so the person can sign up again.{" "}
            <strong className="font-medium text-foreground">Ban</strong> blocks
            sign-in but keeps the account.{" "}
            <strong className="font-medium text-foreground">Plan</strong> and{" "}
            <strong className="font-medium text-foreground">Role</strong>{" "}
            changes (and bans) reach the AI and admin endpoints immediately,
            they read the session fresh, but the person&apos;s
            header/account display can lag up to five minutes (the session
            cookie cache). Demoting an admin who is still listed in
            ADMIN_EMAILS / ADMIN_USER_IDS only lasts until their next sign-in
, remove them from the config too.
          </p>
        </PanelBody>
      </Panel>
    </>
  );
}
