"use client";

/**
 * Admin dashboard — list users and remove / ban them. Built on the shadcn UI
 * primitives in `components/ui` (Card, Table, Button, Badge, Input).
 *
 * Security model (matches the codebase's "auth gates actions, not content"
 * rule): this page is a normal client component reading the session via
 * `useSession()`, so it can stay statically prerendered like /account. The real
 * authorization happens *server-side* — every `authClient.admin.*` call hits a
 * Better Auth endpoint that rejects non-admins (see the `admin` plugin in
 * lib/auth/server.ts). So a non-admin who opens /admin just sees an
 * access-denied notice and can't read or mutate anything.
 *
 * "Remove" is a hard delete: it drops the user row, which cascades to their
 * sessions + accounts (ON DELETE CASCADE in migrations/0001) and frees the
 * unique email — so the person can immediately sign up again with OAuth or
 * email/password. "Ban" is the soft alternative: blocks sign-in but keeps the
 * row (and the email) occupied.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  CircleAlert,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import Link from "../_components/Link";
import { authClient, useSession } from "@/lib/auth/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/** Subset of the Better Auth admin `listUsers` row we render. */
interface AdminUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  banned?: boolean | null;
  createdAt: string | Date;
}

/** How many users to pull in one page (the dashboard filters client-side). */
const LIST_LIMIT = 200;

function formatJoined(value: string | Date): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
}

export function AdminClient() {
  const { data: session, isPending: sessionPending } = useSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [query, setQuery] = useState("");
  // The user-id whose action (remove/ban) is mid-flight, and the user-id with a
  // pending "confirm remove" prompt (inline two-step delete, no modal needed).
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    const { data, error: listError } = await authClient.admin.listUsers({
      query: { limit: LIST_LIMIT, sortBy: "createdAt", sortDirection: "desc" },
    });
    if (listError) {
      // 401/403 means "signed in but not an admin" — show a distinct notice.
      if (listError.status === 401 || listError.status === 403) {
        setDenied(true);
      } else {
        setError(listError.message ?? "Couldn't load users. Please try again.");
      }
      setUsers([]);
    } else {
      setUsers((data?.users ?? []) as AdminUser[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch once a session is confirmed (the admin-gated request is rejected
    // server-side for non-admins). No session → we fall through to the sign-in
    // prompt below, which doesn't read `loading`.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount; the fetch's setState is intentional
    if (!sessionPending && session) void loadUsers();
  }, [sessionPending, session, loadUsers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [users, query]);

  async function handleRemove(userId: string) {
    setBusyId(userId);
    setError(null);
    const { error: removeError } = await authClient.admin.removeUser({
      userId,
    });
    if (removeError) {
      setError(removeError.message ?? "Couldn't remove that user.");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    }
    setBusyId(null);
    setConfirmId(null);
  }

  async function handleToggleBan(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
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
    setBusyId(null);
  }

  // --- Gating states -------------------------------------------------------

  if (sessionPending) {
    return <CenteredNote>Loading…</CenteredNote>;
  }

  if (!session) {
    return (
      <div className="text-center">
        <p className="text-[15px] text-[var(--ds-gray-700)] dark:text-[var(--ds-gray-300)]">
          Sign in to access the admin dashboard.
        </p>
        <Link
          href="/sign-in"
          className="mt-5 inline-flex items-center justify-center rounded-xl bg-[var(--ds-blue-600)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--ds-blue-700)]"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (denied) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <CircleAlert className="size-8 text-muted-foreground" />
          <div>
            <p className="font-medium">You don&apos;t have admin access</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as {session.user.email}. Ask an existing admin to grant
              you access.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // --- Dashboard -----------------------------------------------------------

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          {loading
            ? "Loading users…"
            : `${users.length} ${users.length === 1 ? "account" : "accounts"}`}
        </CardDescription>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadUsers()}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
            aria-label="Search users"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            <CircleAlert className="size-4 shrink-0" />
            {error}
          </p>
        )}

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {users.length === 0
                      ? "No users yet."
                      : "No users match your search."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => {
                  const isSelf = user.id === session.user.id;
                  const isBusy = busyId === user.id;
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="max-w-0">
                        <div className="flex items-center gap-3">
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
                            <div className="truncate font-medium">
                              {user.name || "—"}
                              {isSelf && (
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.role === "admin" ? (
                          <Badge>
                            <ShieldCheck />
                            Admin
                          </Badge>
                        ) : (
                          <Badge variant="secondary">User</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatJoined(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">
                            Manage elsewhere
                          </span>
                        ) : confirmId === user.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs text-muted-foreground">
                              Remove?
                            </span>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleRemove(user.id)}
                              disabled={isBusy}
                            >
                              {isBusy ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                "Yes, remove"
                              )}
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
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleToggleBan(user)}
                              disabled={isBusy}
                              title={
                                user.banned
                                  ? "Lift the ban"
                                  : "Block sign-in (keeps the account)"
                              }
                            >
                              {user.banned ? (
                                <ShieldCheck />
                              ) : (
                                <Ban />
                              )}
                              {user.banned ? "Unban" : "Ban"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setConfirmId(user.id)}
                              disabled={isBusy}
                              title="Delete the account (frees the email for re-signup)"
                            >
                              <Trash2 />
                              Remove
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <p className="text-xs text-muted-foreground">
          <strong className="font-medium text-foreground">Remove</strong>{" "}
          permanently deletes the account and all its sessions, freeing the
          email so the person can sign up again.{" "}
          <strong className="font-medium text-foreground">Ban</strong> blocks
          sign-in but keeps the account.
        </p>
      </CardContent>
    </Card>
  );
}

function CenteredNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-sm text-[var(--ds-gray-500)]">{children}</p>
  );
}
