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
 * against the configured site-wide cap. Presentation follows the soft
 * design kit in `_components/shared.tsx`; the numeric tables keep their
 * tabular layout on mobile and scroll horizontally (the ui Table wrapper is
 * already overflow-x-auto).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useSession } from "@/lib/auth/client";
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
import type { AiUsageReport } from "@/app/api/admin/ai-usage/route";
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
  cellClass,
  headRowClass,
  isImpersonatedSession,
  isTestEmail,
  quietActionClass,
  rowClass,
  softInputClass,
  theadClass,
} from "../_components/shared";

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
    <Panel className="flex flex-col gap-1 p-4 sm:p-5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold">{value}</span>
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
      {children}
    </Panel>
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
      ? { fill: "bg-red-600", track: "bg-red-500/15 dark:bg-red-500/20" }
      : fraction >= 0.6
        ? { fill: "bg-amber-500", track: "bg-amber-500/15 dark:bg-amber-500/20" }
        : { fill: "bg-blue-600", track: "bg-blue-500/15 dark:bg-blue-500/20" };
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

  // Monotonic sequence: flipping the day picker quickly fires overlapping
  // fetches, and a slow stale response must not overwrite the newer report
  // (or snap the picker back to the stale day).
  const loadSeq = useRef(0);

  const load = useCallback(async (requestedDay?: string) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const qs = requestedDay ? `?day=${requestedDay}` : "";
      const res = await fetch(`/api/admin/ai-usage${qs}`);
      if (seq !== loadSeq.current) return; // superseded by a newer load
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setDenied(true);
        } else {
          setError("Couldn't load AI usage. Please try again.");
        }
        setReport(null);
      } else {
        const data = (await res.json()) as AiUsageReport;
        if (seq !== loadSeq.current) return;
        setReport(data);
        setDay(data.day);
      }
    } catch {
      if (seq !== loadSeq.current) return;
      setError("Couldn't load AI usage. Please try again.");
      setReport(null);
    }
    if (seq === loadSeq.current) setLoading(false);
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

  // The `global` totals only cover the server's recent-days window — a day
  // older than that has no entry, which must read as "no data", not "0
  // tokens" (the per-user table below may show real usage for it).
  const dayEntry = report?.global.find((g) => g.day === report.day);
  const dayTotal = dayEntry?.totalTok ?? 0;
  const dayInWindow = dayEntry !== undefined;
  const chatRequests =
    report?.users.reduce((sum, u) => sum + u.requests, 0) ?? 0;
  const completions =
    report?.users.reduce((sum, u) => sum + u.completions, 0) ?? 0;

  return (
    <>
      <AdminPageHeader
        title="AI usage"
        description="Ask AI chat, inline-completion, and suggested-question spend, per user and site-wide."
      />
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-wrap items-center gap-2">
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
            className={`${softInputClass} w-40`}
          />
          <Button
            variant="ghost"
            size="sm"
            className={quietActionClass}
            onClick={() => void load(day || undefined)}
            disabled={loading}
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            label="Tokens used"
            value={loading ? "…" : dayInWindow ? compact.format(dayTotal) : "—"}
            detail={
              report
                ? dayInWindow
                  ? `${Math.round((dayTotal / report.globalCap) * 100)}% of the ${compact.format(report.globalCap)} daily cap`
                  : "Totals are only kept for recent days"
                : undefined
            }
          >
            {report && dayInWindow && (
              <CapMeter fraction={dayTotal / report.globalCap} />
            )}
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

        <Panel>
          <PanelHeader
            title="Per-user usage"
            description={
              loading
                ? "Loading…"
                : `${report?.users.length ?? 0} ${
                    (report?.users.length ?? 0) === 1 ? "user" : "users"
                  } with AI activity on ${report?.day ?? "—"}`
            }
          />
          <PanelBody>
            {loading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                Loading…
              </p>
            ) : !report || report.users.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No AI activity on this day.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={headRowClass}>
                    <TableHead className={theadClass}>User</TableHead>
                    <TableHead className={theadClass}>Plan</TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Chat requests
                    </TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Chat tokens
                    </TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Completions
                    </TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Completion tokens
                    </TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Suggestions
                    </TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Suggestion tokens
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.users.map((u) => (
                    <TableRow key={u.userId} className={rowClass}>
                      {/* min/max widths keep the identity column readable
                          while the wrapper scrolls horizontally on mobile. */}
                      <TableCell className={`${cellClass} min-w-44 max-w-56`}>
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
                      <TableCell className={cellClass}>
                        <PlanBadge plan={u.plan} />
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(u.requests)}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(u.inputTok + u.outputTok)}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(u.completions)}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(u.completionInTok + u.completionOutTok)}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(u.suggests)}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(u.suggestInTok + u.suggestOutTok)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              Tokens are input + output as reported by the provider (or a
              char/4 estimate when it doesn&apos;t report usage). Usage is
              recorded just after each response finishes, so very recent
              activity can take a moment to appear.
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Recent days"
            description="Site-wide daily token totals against the global cap."
          />
          <PanelBody>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                Loading…
              </p>
            ) : !report || report.global.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No usage recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className={headRowClass}>
                    <TableHead className={theadClass}>Day</TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      Tokens
                    </TableHead>
                    <TableHead className={`${theadClass} text-right`}>
                      % of cap
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.global.map((g) => (
                    <TableRow key={g.day} className={rowClass}>
                      <TableCell className={`${cellClass} font-medium`}>
                        {g.day}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {full.format(g.totalTok)}
                      </TableCell>
                      <TableCell className={`${cellClass} text-right tabular-nums`}>
                        {Math.round((g.totalTok / report.globalCap) * 100)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
