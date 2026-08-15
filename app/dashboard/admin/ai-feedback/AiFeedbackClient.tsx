"use client";

/**
 * Ask AI answer ratings with the exchange each refers to, from
 * GET /api/admin/ai-feedback (admin-enforced server-side). Only rated
 * exchanges are ever stored, so an empty page means nobody has rated
 * anything, not that the feature is broken.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type {
  AiFeedbackReport,
  AiFeedbackRow,
} from "@/app/api/admin/ai-feedback/route";
import {
  AccessDeniedCard,
  AdminPageHeader,
  CenteredNote,
  ErrorNote,
  Panel,
  PanelBody,
  PanelHeader,
  CenteredNote as Note,
  SignInPrompt,
  isImpersonatedSession,
  quietActionClass,
} from "../_components/shared";

type Filter = "down" | "up" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "down", label: "Needs attention" },
  { id: "up", label: "Liked" },
  { id: "all", label: "All" },
];

/** "3 Feb, 14:05" — only rendered after a fetch, so no hydration mismatch. */
function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}

/** Where the question was asked, clickable when it is a page. A `learn` slug
 *  already includes the collection segment, so the link is just `/<slug>`. */
function Where({ row }: { row: AiFeedbackRow }) {
  if (!row.slug) return <span className="text-muted-foreground">—</span>;
  if (row.surface === "playground") {
    return <span className="text-muted-foreground">playground · {row.slug}</span>;
  }
  return (
    <a
      href={`/${row.slug}`}
      className="text-[var(--ds-blue-700)] hover:underline dark:text-[var(--ds-blue-400)]"
    >
      {row.slug}
    </a>
  );
}

function FeedbackCard({ row }: { row: AiFeedbackRow }) {
  const [open, setOpen] = useState(false);
  const down = row.rating === "down";
  return (
    <div className="border-b border-zinc-500/10 py-4 last:border-b-0 dark:border-white/10">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
            down
              ? "bg-red-500/10 text-red-600 dark:text-red-400"
              : "bg-green-500/10 text-green-600 dark:text-green-400",
          )}
          aria-label={down ? "Rated bad" : "Rated good"}
        >
          {down ? <ThumbsDown className="size-3.5" /> : <ThumbsUp className="size-3.5" />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[1.6] font-medium break-words">
            {row.question || <span className="text-muted-foreground">(no question recorded)</span>}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
            <Where row={row} />
            <span aria-hidden>·</span>
            <span>{row.email}</span>
            <span aria-hidden>·</span>
            <span>{when(row.createdAt)}</span>
            {row.model && (
              <>
                <span aria-hidden>·</span>
                <span className="font-mono text-[12px]">{row.model}</span>
              </>
            )}
          </p>

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn("mt-2 text-[13px] font-medium", quietActionClass)}
          >
            {open ? "Hide answer" : "Show answer"}
          </button>
          {open && (
            <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-zinc-500/[0.06] p-3 text-[13px] leading-[1.6] whitespace-pre-wrap dark:bg-white/[0.05]">
              {row.answer || "(no answer recorded)"}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

export function AiFeedbackClient() {
  const { data: session, isPending: sessionPending } = useSession();
  const [report, setReport] = useState<AiFeedbackReport | null>(null);
  const [filter, setFilter] = useState<Filter>("down");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);

  // Monotonic sequence: a slow stale response must not overwrite a newer one.
  const loadSeq = useRef(0);

  const load = useCallback(async (next: Filter) => {
    const seq = ++loadSeq.current;
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const qs = new URLSearchParams();
      if (next !== "all") qs.set("rating", next);
      const res = await fetch(`/api/admin/ai-feedback?${qs.toString()}`);
      if (seq !== loadSeq.current) return;
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setDenied(true);
        else setError("Couldn't load AI feedback. Please try again.");
        setReport(null);
      } else {
        const data = (await res.json()) as AiFeedbackReport;
        if (seq !== loadSeq.current) return;
        setReport(data);
      }
    } catch {
      if (seq !== loadSeq.current) return;
      setError("Couldn't load AI feedback. Please try again.");
      setReport(null);
    }
    if (seq === loadSeq.current) setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount; the fetch's setState is intentional
    if (!sessionPending && session) void load(filter);
    // Mount-only: later loads are driven by the filter buttons.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const totals = report?.totals ?? { up: 0, down: 0 };
  const rated = totals.up + totals.down;
  const pct = rated ? Math.round((totals.up / rated) * 100) : 0;

  return (
    <>
      <AdminPageHeader
        title="AI Feedback"
        description="Answers readers rated in the Ask AI panel. Only rated exchanges are stored; everything else is never written down."
      />

      <Panel className="mb-5">
        <PanelHeader
          title={
            rated
              ? `${pct}% positive · ${totals.up} up, ${totals.down} down`
              : "No ratings yet"
          }
          description={
            rated
              ? "Across all ratings, not just the filter below."
              : "Nothing has been rated in the Ask AI panel yet."
          }
          action={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void load(filter)}
              disabled={loading}
              className={quietActionClass}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              Refresh
            </Button>
          }
        />
      </Panel>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.id}
            variant={filter === f.id ? "default" : "ghost"}
            size="sm"
            onClick={() => {
              setFilter(f.id);
              void load(f.id);
            }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Panel>
        <PanelBody>
          {loading && !report ? (
            <Note>Loading…</Note>
          ) : !report?.rows.length ? (
            <Note>
              {filter === "down"
                ? "No answers have been rated bad. "
                : filter === "up"
                  ? "No answers have been rated good. "
                  : "No answers have been rated. "}
              Ratings appear here as readers leave them.
            </Note>
          ) : (
            report.rows.map((row) => (
              <FeedbackCard key={`${row.userId}:${row.turnId}`} row={row} />
            ))
          )}
        </PanelBody>
      </Panel>
    </>
  );
}
