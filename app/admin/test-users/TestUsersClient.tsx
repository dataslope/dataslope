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
 *
 * Presentation follows the soft design kit in `_components/shared.tsx`; the
 * account list renders as a table on desktop and stacked cards on mobile.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  VenetianMask,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth/client";
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
  TEST_EMAIL_DOMAIN,
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
/** Backstop on the pagination loop — 50 pages of 200 is far beyond any
 *  plausible test-account count and keeps a server bug from looping forever. */
const MAX_LIST_PAGES = 50;

/** Random base-36 slug from the Web Crypto CSPRNG. These slugs become live
 *  credentials — default passwords and sign-in-able email prefixes on
 *  pre-verified (often Pro) accounts — so Math.random()'s guessable output
 *  isn't good enough. */
function randomSlug(length = 5): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
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
    // Filter server-side (email ends with the reserved domain) and page
    // through EVERY match. Filtering one newest-first page client-side would
    // hide any test account older than the newest LIST_LIMIT sign-ups — and
    // "Remove all" would silently skip it while claiming the cleanup is done.
    try {
      const collected: TestUser[] = [];
      for (let page = 0; page < MAX_LIST_PAGES; page++) {
        const { data, error: listError } = await authClient.admin.listUsers({
          query: {
            limit: LIST_LIMIT,
            offset: collected.length,
            sortBy: "createdAt",
            sortDirection: "desc",
            searchValue: `@${TEST_EMAIL_DOMAIN}`,
            searchField: "email",
            searchOperator: "ends_with",
          },
        });
        if (listError) {
          if (listError.status === 401 || listError.status === 403) {
            setDenied(true);
          } else {
            setError(
              listError.message ?? "Couldn't load users. Please try again.",
            );
          }
          setUsers([]);
          setLoading(false);
          return;
        }
        const batch = (data?.users ?? []) as TestUser[];
        collected.push(...batch);
        const totalMatches = data?.total ?? collected.length;
        if (batch.length === 0 || collected.length >= totalMatches) break;
      }
      // isTestEmail is the same domain rule — a belt-and-braces re-check.
      setUsers(collected.filter((u) => isTestEmail(u.email)));
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setUsers([]);
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
      try {
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
      } catch {
        setCreateError(
          "Couldn't reach the server. Please check your connection and try again.",
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
    try {
      const { error: removeError } = await authClient.admin.removeUser({
        userId: user.id,
      });
      if (removeError) {
        setError(removeError.message ?? "Couldn't remove that user.");
      } else {
        setUsers((prev) => prev.filter((u) => u.id !== user.id));
        setCreated((prev) => prev.filter((c) => c.email !== user.email));
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setBusyId(null);
  }

  async function handleRemoveAll() {
    setRemoveAll("busy");
    setError(null);
    try {
      for (const user of users) {
        const { error: removeError } = await authClient.admin.removeUser({
          userId: user.id,
        });
        if (removeError) {
          setError(removeError.message ?? "Couldn't remove every test user.");
          break;
        }
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    }
    setCreated([]);
    await loadTestUsers();
    setRemoveAll("idle");
  }

  // --- Row pieces shared by the desktop table and the mobile card list ----

  const renderPlan = (user: TestUser, isBusy: boolean) => (
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

  const renderActions = (user: TestUser, isBusy: boolean) => (
    <div className="flex flex-wrap items-center gap-1 md:flex-nowrap">
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
      <Button
        variant="ghost"
        size="sm"
        className={dangerActionClass}
        onClick={() => void handleRemove(user)}
        disabled={isBusy}
        title="Delete this test account"
      >
        {isBusy ? <Loader2 className="animate-spin" /> : <Trash2 />}
        Remove
      </Button>
    </div>
  );

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
        "flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors sm:flex-none " +
        (plan === value
          ? "bg-white text-foreground shadow-sm dark:bg-white/15 dark:text-white"
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
      <div className="flex flex-col gap-5 sm:gap-6">
        <Panel>
          <PanelHeader
            title="Create test users"
            description={`Accounts are created verified on a reserved @${TEST_EMAIL_DOMAIN} address — no verification email, no billing.`}
          />
          <PanelBody>
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 gap-4 sm:flex sm:flex-wrap sm:items-end">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Plan</span>
                  <div className="flex items-center gap-1 rounded-lg bg-zinc-500/[0.07] p-1 sm:w-fit dark:bg-white/[0.07]">
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
                    className={`${softInputClass} w-full sm:w-24`}
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
                    className={`${softInputClass} w-full font-mono sm:w-48`}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {count === 1 && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="test-user-email" className="text-sm font-medium">
                      Email{" "}
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <Input
                        id="test-user-email"
                        type="text"
                        placeholder={`test-${plan}-abc12`}
                        value={emailPrefix}
                        onChange={(e) => setEmailPrefix(e.target.value)}
                        className={`${softInputClass} w-full font-mono sm:w-44`}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <span className="shrink-0 text-sm text-muted-foreground">
                        @{TEST_EMAIL_DOMAIN}
                      </span>
                    </div>
                  </div>
                )}
                <Button
                  type="submit"
                  disabled={creating || password.length === 0}
                  className="w-full sm:w-auto"
                >
                  {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Create {count > 1 ? `${count} test users` : "test user"}
                </Button>
              </div>

              {createError && <ErrorNote>{createError}</ErrorNote>}
            </form>

            {created.length > 0 && (
              <div className="mt-5 rounded-xl bg-zinc-500/[0.06] p-4 dark:bg-white/[0.05]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Created {created.length}{" "}
                    {created.length === 1 ? "account" : "accounts"}. Save these
                    credentials — passwords aren&apos;t shown again.
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={quietActionClass}
                    onClick={() => void handleCopy()}
                  >
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
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Existing test users"
            description={
              loading
                ? "Loading…"
                : `${users.length} ${users.length === 1 ? "account" : "accounts"} on @${TEST_EMAIL_DOMAIN}`
            }
            action={
              removeAll === "confirm" ? (
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
                      variant="ghost"
                      size="sm"
                      className={dangerActionClass}
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
                    variant="ghost"
                    size="sm"
                    className={quietActionClass}
                    onClick={() => void loadTestUsers()}
                    disabled={loading}
                  >
                    <RefreshCw className={loading ? "animate-spin" : undefined} />
                    Refresh
                  </Button>
                </>
              )
            }
          />
          <PanelBody className="flex flex-col gap-4">
            {error && <ErrorNote>{error}</ErrorNote>}

            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                Loading…
              </p>
            ) : users.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No test users yet — create some above.
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
                        <TableHead className={theadClass}>Created</TableHead>
                        <TableHead className={`${theadClass} text-right`}>
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => {
                        const isBusy = busyId === user.id;
                        return (
                          <TableRow key={user.id} className={rowClass}>
                            {/* w-full + max-w-0: take the leftover table
                                width, but still truncate instead of
                                stretching it. */}
                            <TableCell className={`${cellClass} w-full max-w-0`}>
                              <div className="min-w-0">
                                <div className="truncate font-medium">
                                  {user.name || "—"}
                                </div>
                                <div className="truncate font-mono text-xs text-muted-foreground">
                                  {user.email}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className={cellClass}>
                              {renderPlan(user, isBusy)}
                            </TableCell>
                            <TableCell
                              className={`${cellClass} text-muted-foreground`}
                            >
                              {formatJoined(user.createdAt)}
                            </TableCell>
                            <TableCell className={`${cellClass} text-right`}>
                              <div className="flex justify-end">
                                {renderActions(user, isBusy)}
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
                    const isBusy = busyId === user.id;
                    return (
                      <li
                        key={user.id}
                        className="flex flex-col gap-2.5 border-b border-zinc-500/[0.07] py-4 first:pt-1 last:border-b-0 last:pb-1 dark:border-white/[0.05]"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {user.name || "—"}
                            </div>
                            <div className="truncate font-mono text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                          {renderPlan(user, isBusy)}
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-xs text-muted-foreground">
                            Created {formatJoined(user.createdAt)}
                          </span>
                          <div className="-mr-2">
                            {renderActions(user, isBusy)}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Test users are ordinary accounts identified by the reserved
              @{TEST_EMAIL_DOMAIN} domain — safe to remove at any time. Plan
              changes reach the AI endpoints immediately — they read the
              session fresh — but the account&apos;s header/plan display can
              lag up to five minutes (the session cookie cache).
            </p>
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
