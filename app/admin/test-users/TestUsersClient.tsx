"use client";

/**
 * Test users section — create disposable accounts for exercising
 * member-gated features (AI autocomplete is pro-only; Ask AI budgets differ
 * by tier) without touching real accounts or a billing system.
 *
 * How it works: creation goes through Better Auth's admin `create-user`
 * endpoint (server-side admin check included), passing `data: { plan,
 * emailVerified: true }` — so test users are born verified (no email
 * round-trip; their @dataslope.test addresses couldn't receive one anyway)
 * with the chosen membership plan. No verification email is ever sent on
 * this path, unlike normal sign-up.
 *
 * Test accounts are identified purely by the reserved @dataslope.test email
 * domain (see TEST_EMAIL_DOMAIN): that's what this page lists, and what the
 * Users table badges as "Test". Passwords are only shown at creation time —
 * to get into an existing test account, impersonate it (or remove and
 * recreate it).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  CircleAlert,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  VenetianMask,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth/client";
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
import {
  AccessDeniedCard,
  AdminPageHeader,
  CenteredNote,
  PlanBadge,
  SignInPrompt,
  TEST_EMAIL_DOMAIN,
  formatJoined,
  impersonateUser,
  isImpersonatedSession,
  isTestEmail,
  setUserPlan,
} from "../_components/shared";

interface TestUser {
  id: string;
  name: string;
  email: string;
  plan?: string | null;
  createdAt: string | Date;
}

interface CreatedAccount {
  email: string;
  password: string;
  plan: "free" | "pro";
}

const LIST_LIMIT = 200;
const MAX_BATCH = 10;

function randomSlug(length = 5): string {
  return Math.random()
    .toString(36)
    .slice(2, 2 + length);
}

export function TestUsersClient() {
  const { data: session, isPending: sessionPending } = useSession();

  // --- Creation form -------------------------------------------------------
  const [plan, setPlan] = useState<"free" | "pro">("pro");
  const [count, setCount] = useState(1);
  // Filled client-side after mount: a random default in the prerendered HTML
  // would mismatch on hydration, and a fixed default password would be public
  // knowledge (this repo) on live test accounts.
  const [password, setPassword] = useState("");
  const [emailPrefix, setEmailPrefix] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedAccount[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only random default; see comment on the state above
    setPassword((prev) => prev || `test-${randomSlug(8)}`);
  }, []);

  // --- Existing test users -------------------------------------------------
  const [users, setUsers] = useState<TestUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removeAll, setRemoveAll] = useState<"idle" | "confirm" | "busy">(
    "idle",
  );

  const loadTestUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    const { data, error: listError } = await authClient.admin.listUsers({
      query: { limit: LIST_LIMIT, sortBy: "createdAt", sortDirection: "desc" },
    });
    if (listError) {
      if (listError.status === 401 || listError.status === 403) {
        setDenied(true);
      } else {
        setError(listError.message ?? "Couldn't load users. Please try again.");
      }
      setUsers([]);
    } else {
      const all = (data?.users ?? []) as TestUser[];
      setUsers(all.filter((u) => isTestEmail(u.email)));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount; the fetch's setState is intentional
    if (!sessionPending && session) void loadTestUsers();
  }, [sessionPending, session, loadTestUsers]);

  const credentialsText = useMemo(
    () => created.map((c) => `${c.email}\t${c.password}\t${c.plan}`).join("\n"),
    [created],
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    const pw = password.trim();
    if (pw.length < 8) {
      setCreateError("Password must be at least 8 characters.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    setCopied(false);

    const batch: CreatedAccount[] = [];
    const label = plan === "pro" ? "Pro" : "Free";
    for (let i = 0; i < count; i++) {
      const slug = randomSlug();
      const prefix =
        count === 1 && emailPrefix.trim()
          ? emailPrefix.trim().toLowerCase()
          : `test-${plan}-${slug}`;
      const email = `${prefix}@${TEST_EMAIL_DOMAIN}`;
      const { error: createErr } = await authClient.admin.createUser({
        email,
        password: pw,
        name: `Test ${label} ${slug}`,
        role: "user",
        // `emailVerified: true` skips verification (a @dataslope.test address
        // can't receive mail); `plan` sets the membership tier directly —
        // exactly what a billing webhook would do.
        data: { plan, emailVerified: true },
      });
      if (createErr) {
        setCreateError(
          createErr.message ??
            "Couldn't create a test user. Check the email prefix isn't taken.",
        );
        break;
      }
      batch.push({ email, password: pw, plan });
    }

    if (batch.length > 0) {
      setCreated(batch);
      setEmailPrefix("");
      await loadTestUsers();
    }
    setCreating(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(credentialsText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions) — the text is on screen anyway.
    }
  }

  async function handleTogglePlan(user: TestUser) {
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

  async function handleImpersonate(user: TestUser) {
    setBusyId(user.id);
    setError(null);
    const impError = await impersonateUser(user.id);
    if (impError) setError(impError);
    setBusyId(null);
  }

  async function handleRemove(user: TestUser) {
    setBusyId(user.id);
    setError(null);
    const { error: removeError } = await authClient.admin.removeUser({
      userId: user.id,
    });
    if (removeError) {
      setError(removeError.message ?? "Couldn't remove that user.");
    } else {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setCreated((prev) => prev.filter((c) => c.email !== user.email));
    }
    setBusyId(null);
  }

  async function handleRemoveAll() {
    setRemoveAll("busy");
    setError(null);
    for (const user of users) {
      const { error: removeError } = await authClient.admin.removeUser({
        userId: user.id,
      });
      if (removeError) {
        setError(removeError.message ?? "Couldn't remove every test user.");
        break;
      }
    }
    setCreated([]);
    await loadTestUsers();
    setRemoveAll("idle");
  }

  // --- Gating states -------------------------------------------------------

  if (sessionPending) return <CenteredNote>Loading…</CenteredNote>;
  if (!session) return <SignInPrompt />;
  if (denied) {
    return (
      <AccessDeniedCard
        email={session.user.email}
        impersonated={isImpersonatedSession(session)}
      />
    );
  }

  const planButton = (value: "free" | "pro", label: string) => (
    <button
      type="button"
      onClick={() => setPlan(value)}
      aria-pressed={plan === value}
      className={
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
        (plan === value
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {label}
    </button>
  );

  // --- Page ----------------------------------------------------------------

  return (
    <>
      <AdminPageHeader
        title="Test users"
        description="Disposable, pre-verified accounts for testing member-gated features like AI autocomplete."
      />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Create test users</CardTitle>
            <CardDescription>
              Accounts are created verified on a reserved @{TEST_EMAIL_DOMAIN}{" "}
              address — no verification email, no billing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Plan</span>
                  <div className="flex w-fit items-center gap-1 rounded-lg bg-muted p-1">
                    {planButton("free", "Free")}
                    {planButton("pro", "Pro")}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="test-user-count" className="text-sm font-medium">
                    How many
                  </label>
                  <Input
                    id="test-user-count"
                    type="number"
                    min={1}
                    max={MAX_BATCH}
                    value={count}
                    onChange={(e) =>
                      setCount(
                        Math.max(
                          1,
                          Math.min(MAX_BATCH, Number(e.target.value) || 1),
                        ),
                      )
                    }
                    className="w-24"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="test-user-password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="test-user-password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-48 font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {count === 1 && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="test-user-email" className="text-sm font-medium">
                      Email <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <Input
                        id="test-user-email"
                        type="text"
                        placeholder={`test-${plan}-abc12`}
                        value={emailPrefix}
                        onChange={(e) => setEmailPrefix(e.target.value)}
                        className="w-44 font-mono"
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <span className="text-sm text-muted-foreground">
                        @{TEST_EMAIL_DOMAIN}
                      </span>
                    </div>
                  </div>
                )}
                <Button type="submit" disabled={creating || password.length === 0}>
                  {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Create {count > 1 ? `${count} test users` : "test user"}
                </Button>
              </div>

              {createError && (
                <p
                  role="alert"
                  className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  <CircleAlert className="size-4 shrink-0" />
                  {createError}
                </p>
              )}
            </form>

            {created.length > 0 && (
              <div className="mt-5 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Created {created.length}{" "}
                    {created.length === 1 ? "account" : "accounts"}. Save these
                    credentials — passwords aren&apos;t shown again.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => void handleCopy()}>
                    {copied ? <Check /> : <Copy />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6">
                  {created
                    .map((c) => `${c.email}  ${c.password}  (${c.plan})`)
                    .join("\n")}
                </pre>
                <p className="mt-2 text-xs text-muted-foreground">
                  Sign in with these at /sign-in from a private window — or use
                  Impersonate below to become one in this browser (come back to
                  /admin to stop).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing test users</CardTitle>
            <CardDescription>
              {loading
                ? "Loading…"
                : `${users.length} ${users.length === 1 ? "account" : "accounts"} on @${TEST_EMAIL_DOMAIN}`}
            </CardDescription>
            <div className="col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end">
              {removeAll === "confirm" ? (
                <>
                  <span className="text-xs text-muted-foreground">
                    Remove all {users.length}?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => void handleRemoveAll()}
                  >
                    Yes, remove all
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveAll("idle")}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  {users.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRemoveAll("confirm")}
                      disabled={removeAll === "busy" || loading}
                    >
                      {removeAll === "busy" ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 />
                      )}
                      Remove all
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void loadTestUsers()}
                    disabled={loading}
                  >
                    <RefreshCw className={loading ? "animate-spin" : undefined} />
                    Refresh
                  </Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
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
                    <TableHead>Plan</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <Loader2 className="mr-2 inline size-4 animate-spin" />
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No test users yet — create some above.
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => {
                      const isBusy = busyId === user.id;
                      return (
                        <TableRow key={user.id}>
                          {/* w-full + max-w-0: take the leftover table width,
                              but still truncate instead of stretching it. */}
                          <TableCell className="w-full max-w-0">
                            <div className="min-w-0">
                              <div className="truncate font-medium">
                                {user.name || "—"}
                              </div>
                              <div className="truncate font-mono text-xs text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <PlanBadge plan={user.plan} />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
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
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatJoined(user.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleImpersonate(user)}
                                disabled={isBusy}
                                title="Browse the site as this user (come back to /admin to stop)"
                              >
                                <VenetianMask />
                                Impersonate
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => void handleRemove(user)}
                                disabled={isBusy}
                                title="Delete this test account"
                              >
                                {isBusy ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <Trash2 />
                                )}
                                Remove
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <p className="text-xs text-muted-foreground">
              Test users are ordinary accounts identified by the reserved
              @{TEST_EMAIL_DOMAIN} domain — safe to remove at any time. Plan
              changes can take up to five minutes to reach an already-signed-in
              session (the session cookie cache); impersonation and fresh
              sign-ins see the new plan immediately.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
