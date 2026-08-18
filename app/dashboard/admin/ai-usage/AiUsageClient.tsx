"use client";

/**
 * AI usage per user and site-wide over a chosen window, from
 * GET /api/admin/ai-usage?start&end (admin-enforced server-side). Date math is
 * UTC to match server-side bucketing (`ai_usage_daily.day` is a UTC
 * 'YYYY-MM-DD'). Usage is recorded post-response via waitUntil, so very
 * recent activity can lag a refresh.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
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

// ─── Date window ──────────────────────────────────────────────────────────

type Range = "day" | "week" | "month" | "total";

/** Toggle options with the trailing span in days; Total (span 0) drops the
 *  lower bound entirely. */
const RANGES: { key: Range; label: string; span: number }[] = [
  { key: "day", label: "Day", span: 1 },
  { key: "week", label: "Week", span: 7 },
  { key: "month", label: "Month", span: 30 },
  { key: "total", label: "Total", span: 0 },
];

/** Today as a UTC 'YYYY-MM-DD', matches how the server buckets usage. */
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Shift a UTC 'YYYY-MM-DD' by whole days. */
function addDaysUtc(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** Inclusive [start, end] for a range anchored at the window's end date.
 *  Total has no lower bound (start = null) and always ends today. */
function windowFor(
  range: Range,
  anchor: string,
): { start: string | null; end: string } {
  if (range === "total") return { start: null, end: todayUtc() };
  return { start: addDaysUtc(anchor, -(RANGES.find((r) => r.key === range)!.span - 1)), end: anchor };
}

/** Pretty UTC day, e.g. "Jul 7, 2026". */
const fmtDay = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

/** Human label for the resolved window, shown next to the controls. */
function windowLabel(start: string | null, end: string): string {
  if (!start) return "All time";
  if (start === end) return fmtDay(end);
  return `${fmtDay(start)} to ${fmtDay(end)}`;
}

// ─── Tiles ─────────────────────────────────────────────────────────────────

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

/** Capacity meter stepping accent → warning → danger toward the cap. The % is
 *  also in the tile's detail text, so severity is never color-alone. */
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
      aria-label="Share of a day's global token cap used"
      className={`mt-1 h-1.5 w-full overflow-hidden rounded-full ${tone.track}`}
    >
      <div
        className={`h-full rounded-full ${tone.fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Segmented Day / Week / Month / Total control. */
function RangeToggle({
  value,
  onChange,
}: {
  value: Range;
  onChange: (r: Range) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Usage range"
      className="inline-flex rounded-lg bg-zinc-500/[0.07] p-0.5 dark:bg-white/[0.07]"
    >
      {RANGES.map((r) => {
        const active = r.key === value;
        return (
          <button
            key={r.key}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(r.key)}
            className={cn(
              "rounded-md px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-white text-foreground shadow-sm dark:bg-white/[0.12]"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        );
      })}
    </div>
  );
}

export function AiUsageClient() {
  const { data: session, isPending: sessionPending } = useSession();
  const [report, setReport] = useState<AiUsageReport | null>(null);
  const [range, setRange] = useState<Range>("day");
  // Empty until the first load, then synced to the server's `end`; starting
  // empty avoids an SSR/client `new Date()` hydration mismatch.
  const [anchor, setAnchor] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  // Monotonic sequence: a slow stale response must not overwrite a newer one.
  const loadSeq = useRef(0);

  const load = useCallback(async (nextRange: Range, nextAnchor: string) => {
    const seq = ++loadSeq.current;
    const win = windowFor(nextRange, nextAnchor || todayUtc());
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const qs = new URLSearchParams();
      if (win.start) qs.set("start", win.start);
      qs.set("end", win.end);
      const res = await fetch(`/api/admin/ai-usage?${qs.toString()}`);
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
        // The server is the source of truth for "today".
        setAnchor(data.end);
      }
    } catch {
      if (seq !== loadSeq.current) return;
      setError("Couldn't load AI usage. Please try again.");
      setReport(null);
    }
    if (seq === loadSeq.current) setLoading(false);
  }, []);

  // Keyed on the signed-in USER, not the `session` object: Better Auth
  // refetches the session whenever the tab regains focus and hands back a
  // fresh object each time, so depending on that identity re-ran this load on
  // every tab switch.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount; the fetch's setState is intentional
    if (!sessionPending && userId) void load(range, anchor);
    // Once per signed-in user: later loads are driven by the controls' handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionPending, userId, load]);

  const selectRange = (r: Range) => {
    setRange(r);
    void load(r, anchor);
  };
  const selectAnchor = (a: string) => {
    setAnchor(a);
    if (a) void load(range, a);
  };

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

  const isSingleDay = report ? report.start === report.end : range === "day";
  // Describe the returned window once loaded, else the one being requested.
  const pending = windowFor(range, anchor || todayUtc());
  const label = report
    ? windowLabel(report.start, report.end)
    : windowLabel(pending.start, pending.end);

  const hasTokenData = (report?.activeDays ?? 0) > 0;
  const capPct = report ? Math.round((report.peakDayTok / report.globalCap) * 100) : 0;
  const chatRequests = report?.users.reduce((s, u) => s + u.requests, 0) ?? 0;
  const completions = report?.users.reduce((s, u) => s + u.completions, 0) ?? 0;

  const tokenDetail = !report
    ? undefined
    : !hasTokenData
      ? "No site-wide usage in this window"
      : isSingleDay
        ? `${Math.round((report.totalTok / report.globalCap) * 100)}% of the ${compact.format(report.globalCap)} daily cap`
        : `busiest day ${capPct}% of the ${compact.format(report.globalCap)} daily cap · ${report.activeDays} active ${report.activeDays === 1 ? "day" : "days"}`;

  const userCount = report?.users.length ?? 0;
  const dailyTruncated = report ? report.activeDays > report.daily.length : false;

  return (
    <>
      <AdminPageHeader
        title="AI usage"
        description="Ask AI chat, inline-completion, and suggested-question spend, per user and site-wide."
      />
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <RangeToggle value={range} onChange={selectRange} />
          <div className="flex items-center gap-2">
            <label htmlFor="ai-usage-day" className="text-sm font-medium">
              As of (UTC)
            </label>
            <Input
              id="ai-usage-day"
              type="date"
              value={anchor}
              disabled={range === "total"}
              title={
                range === "total"
                  ? "Total covers all time, pick another range to filter by date"
                  : "The last day the window includes"
              }
              onChange={(e) => selectAnchor(e.target.value)}
              className={`${softInputClass} w-40 disabled:opacity-50`}
            />
          </div>
          <span className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{label}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={`${quietActionClass} ml-auto`}
            onClick={() => void load(range, anchor)}
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
            value={loading ? "…" : hasTokenData ? compact.format(report!.totalTok) : "—"}
            detail={tokenDetail}
          >
            {report && hasTokenData && (
              <CapMeter fraction={report.peakDayTok / report.globalCap} />
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
            value={loading ? "…" : compact.format(userCount)}
          />
        </div>

        <Panel>
          <PanelHeader
            title="Per-user usage"
            description={
              loading
                ? "Loading…"
                : `${userCount} ${userCount === 1 ? "user" : "users"} with AI activity · ${label}`
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
                No AI activity in this window.
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
                      {/* min/max widths keep identity readable while the
                          wrapper scrolls horizontally on mobile. */}
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
              Counts are summed across the selected window. Tokens are input +
              output as reported by the provider (or a char/4 estimate when it
              doesn&apos;t report usage). Usage is recorded just after each
              response finishes, so very recent activity can take a moment to
              appear.
            </p>
          </PanelBody>
        </Panel>

        <Panel>
          <PanelHeader
            title="Daily totals"
            description="Site-wide token total per day against the global daily cap."
          />
          <PanelBody>
            {loading ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 inline size-4 animate-spin" />
                Loading…
              </p>
            ) : !report || report.daily.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No usage recorded in this window.
              </p>
            ) : (
              <>
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
                    {report.daily.map((g) => (
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
                {dailyTruncated && (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Showing the {report.daily.length} most recent days of{" "}
                    {report.activeDays} with usage in this window.
                  </p>
                )}
              </>
            )}
          </PanelBody>
        </Panel>
      </div>
    </>
  );
}
