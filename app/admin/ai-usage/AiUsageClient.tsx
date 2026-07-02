"use client";

/**
 * AI usage section — how much Ask AI chat and inline completion the site
 * served on a given UTC day, per user and in total. This is the page to
 * watch while testing the AI features with test users: counters move as
 * completions/chats land (usage is recorded post-response via waitUntil, so
 * allow a beat before refreshing).
 *
 * Data comes from `GET /api/admin/ai-usage` (admin-enforced server-side).
 * The day picker refetches; global history shows the recent daily totals
 * against the configured site-wide cap.
 */
import { useCallback, useEffect, useState } from "react";
import { CircleAlert, Loader2, RefreshCw } from "lucide-react";
import { useSession } from "@/lib/auth/client";
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
import type { AiUsageReport } from "@/app/api/admin/ai-usage/route";
import {
  AccessDeniedCard,
  AdminPageHeader,
  CenteredNote,
  PlanBadge,
  SignInPrompt,
  isImpersonatedSession,
  isTestEmail,
} from "../_components/shared";
import { Badge } from "@/components/ui/badge";

/** Compact figure for stat tiles: 1,284 → "1.3K", 4200000 → "4.2M". */
const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
/** Full figure for table columns (rendered with tabular-nums to align). */
const full = new Intl.NumberFormat("en");

function StatTile({
  label,
  value,
  detail,
  children,
}: {
  label: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 py-4">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-2xl font-semibold">{value}</span>
        {detail && (
          <span className="text-xs text-muted-foreground">{detail}</span>
        )}
        {children}
      </CardContent>
    </Card>
  );
}

/** Capacity meter: fill severity steps accent → warning → danger as the day
 *  approaches the cap; the unfilled track stays a lighter step of the same
 *  ramp so the state reads across the whole bar. The % is also in the tile's
 *  detail text, so severity is never color-alone. */
function CapMeter({ fraction }: { fraction: number }) {
  const pct = Math.min(100, Math.round(fraction * 100));
  const tone =
    fraction >= 0.85
      ? { fill: "bg-red-600", track: "bg-red-100 dark:bg-red-950" }
      : fraction >= 0.6
        ? { fill: "bg-amber-500", track: "bg-amber-100 dark:bg-amber-950" }
        : { fill: "bg-blue-600", track: "bg-blue-100 dark:bg-blue-950" };
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label="Share of today's global token cap used"
      className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${tone.track}`}
    >
      <div
        className={`h-full rounded-full ${tone.fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function AiUsageClient() {
  const { data: session, isPending: sessionPending } = useSession();
  const [report, setReport] = useState<AiUsageReport | null>(null);
  const [day, setDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  const load = useCallback(async (requestedDay?: string) => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const qs = requestedDay ? `?day=${requestedDay}` : "";
      const res = await fetch(`/api/admin/ai-usage${qs}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setDenied(true);
        } else {
          setError("Couldn't load AI usage. Please try again.");
        }
        setReport(null);
      } else {
        const data = (await res.json()) as AiUsageReport;
        setReport(data);
        setDay(data.day);
      }
    } catch {
      setError("Couldn't load AI usage. Please try again.");
      setReport(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount; the fetch's setState is intentional
    if (!sessionPending && session) void load();
  }, [sessionPending, session, load]);

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

  const dayTotal = report
    ? (report.global.find((g) => g.day === report.day)?.totalTok ?? 0)
    : 0;
  const chatRequests =
    report?.users.reduce((sum, u) => sum + u.requests, 0) ?? 0;
  const completions =
    report?.users.reduce((sum, u) => sum + u.completions, 0) ?? 0;

  return (
    <>
      <AdminPageHeader
        title="AI usage"
        description="Ask AI chat and inline-completion spend, per user and site-wide."
      />
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <label htmlFor="ai-usage-day" className="text-sm font-medium">
            Day (UTC)
          </label>
          <Input
            id="ai-usage-day"
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              if (e.target.value) void load(e.target.value);
            }}
            className="w-40"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => void load(day || undefined)}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
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

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Tokens used"
            value={loading ? "…" : compact.format(dayTotal)}
            detail={
              report
                ? `${Math.round((dayTotal / report.globalCap) * 100)}% of the ${compact.format(report.globalCap)} daily cap`
                : undefined
            }
          >
            {report && <CapMeter fraction={dayTotal / report.globalCap} />}
          </StatTile>
          <StatTile
            label="Chat requests"
            value={loading ? "…" : compact.format(chatRequests)}
          />
          <StatTile
            label="Completions"
            value={loading ? "…" : compact.format(completions)}
          />
          <StatTile
            label="Active users"
            value={loading ? "…" : compact.format(report?.users.length ?? 0)}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Per-user usage</CardTitle>
            <CardDescription>
              {loading
                ? "Loading…"
                : `${report?.users.length ?? 0} ${
                    (report?.users.length ?? 0) === 1 ? "user" : "users"
                  } with AI activity on ${report?.day ?? "—"}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Chat requests</TableHead>
                    <TableHead className="text-right">Chat tokens</TableHead>
                    <TableHead className="text-right">Completions</TableHead>
                    <TableHead className="text-right">
                      Completion tokens
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        <Loader2 className="mr-2 inline size-4 animate-spin" />
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : !report || report.users.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        No AI activity on this day.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.users.map((u) => (
                      <TableRow key={u.userId}>
                        {/* w-full + max-w-0: take the leftover table width,
                            but still truncate instead of stretching it. */}
                        <TableCell className="w-full max-w-0">
                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {u.name || "—"}
                              {isTestEmail(u.email) && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 align-middle"
                                >
                                  Test
                                </Badge>
                              )}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {u.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlanBadge plan={u.plan} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {full.format(u.requests)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {full.format(u.inputTok + u.outputTok)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {full.format(u.completions)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {full.format(u.completionInTok + u.completionOutTok)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Tokens are input + output as reported by the provider (or a
              char/4 estimate when it doesn&apos;t report usage). Usage is
              recorded just after each response finishes, so very recent
              activity can take a moment to appear.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent days</CardTitle>
            <CardDescription>
              Site-wide daily token totals against the global cap.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">% of cap</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-16 text-center text-muted-foreground"
                      >
                        <Loader2 className="mr-2 inline size-4 animate-spin" />
                        Loading…
                      </TableCell>
                    </TableRow>
                  ) : !report || report.global.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="h-16 text-center text-muted-foreground"
                      >
                        No usage recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.global.map((g) => (
                      <TableRow key={g.day}>
                        <TableCell className="font-medium">{g.day}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {full.format(g.totalTok)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round((g.totalTok / report.globalCap) * 100)}%
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
