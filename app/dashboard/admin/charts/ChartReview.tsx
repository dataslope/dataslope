"use client";

/**
 * The review queue layered onto the chart gallery: mark a figure for a redraw,
 * say what is wrong with it, and sign the redraw off when it lands.
 *
 * It is a layer rather than a rewrite because the gallery around it is a
 * *static server component* holding ~1.8 MB of inline SVG, sliced into pages by
 * route segment so a visitor only downloads the twelve figures they are
 * looking at. Turning that into a client page to add three buttons would ship
 * the whole library to render a slice of it. So the SVG stays on the server and
 * only the queue is interactive:
 *
 *   • `ChartReviewProvider` fetches every mark once and holds them.
 *   • `ChartReviewSummary` shows the counts and, crucially, links to the marked
 *     charts that are *not on this page* — the queue spans the library while a
 *     page is one slice of it, so without those links a marked chart on page 4
 *     would be invisible from page 1.
 *   • `ChartMarkControls` is the per-figure row.
 *
 * The gallery is deliberately open to non-admins (it renders build artefacts,
 * not data — see the tools band note in app/dashboard/_studio/nav.ts) while the
 * queue behind `/api/admin/charts` is not. A non-admin therefore gets a 403 on
 * the fetch and simply sees the gallery with no queue attached, which is the
 * intended outcome: look all you like, queuing work is an admin action.
 *
 * The marked/awaiting state is painted on the figure's own section by
 * `.item:has(...)` in charts.module.css, reading the `data-mark-state` this
 * component sets. That keeps the colored frame on the server-rendered element
 * without making it a client component.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, Loader2, RefreshCw, Sparkles, ThumbsUp } from "lucide-react";
import Link from "@/app/_components/Link";
import type { ChartMarksPayload, ChartQueueState } from "@/app/api/admin/charts/route";
import { isAwaitingApproval, type RegenMark } from "@/lib/charts/regenMarks";
import { ChartDelete } from "./ChartDelete";
import styles from "./charts.module.css";

/** How long typing has to pause before the note is written. Long enough that a
 *  sentence is one request, short enough that walking away mid-review still
 *  leaves the note stored. */
const NOTE_SAVE_DELAY = 700;

/** Local, possibly-unsaved state for one chart's queue entry. */
interface MarkState {
  marked: boolean;
  /** What is in the input right now. */
  note: string;
  /** What the server last confirmed, so blur can skip a no-op write. */
  savedNote: string;
  /** Redrawn since anyone last signed it off: the figure wants a look. */
  awaitingApproval: boolean;
  /** When the chart was last redrawn (ISO-8601 UTC), null if never. */
  regeneratedAt: string | null;
  saving: boolean;
  /** Set briefly after a successful write, to flash a tick. */
  justSaved: boolean;
  /** ISO-8601 of an outstanding request to delete this chart from the repo,
   *  null when none. The gallery cannot delete anything, so this is a decision
   *  waiting on a commit; see ChartDelete.tsx. */
  deleteRequestedAt: string | null;
}

const EMPTY_MARK: MarkState = {
  marked: false,
  note: "",
  savedNote: "",
  awaitingApproval: false,
  regeneratedAt: null,
  saving: false,
  justSaved: false,
  deleteRequestedAt: null,
};

function markStateFrom(mark: RegenMark): MarkState {
  return {
    marked: mark.marked,
    note: mark.note,
    savedNote: mark.note,
    awaitingApproval: isAwaitingApproval(mark),
    regeneratedAt: mark.regeneratedAt,
    saving: false,
    justSaved: false,
    deleteRequestedAt: mark.deleteRequestedAt,
  };
}

/** "Aug 3", for the "redrawn <when>" chip. */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface ReviewContext {
  /** Null until the fetch resolves; stays null for a non-admin. */
  marks: Record<string, MarkState> | null;
  available: boolean;
  /** Why the queue is read-only, when it is: the two causes have different
   *  fixes and reporting the wrong one sends people to the wrong file. */
  state: ChartQueueState;
  maxNoteLength: number;
  onToggleMark: (slug: string, marked: boolean) => void;
  onNoteChange: (slug: string, note: string) => void;
  onNoteCommit: (slug: string) => void;
  onApprove: (slug: string) => void;
  /** Written by ChartDelete after its own request, so the button's state and
   *  the summary count both follow one source. */
  onDeleteRequestChange: (slug: string, requestedAt: string | null) => void;
  error: string | null;
}

/**
 * What to say when the queue will not accept writes.
 *
 * `unreadable` is the one worth being specific about. The binding is declared
 * in wrangler.jsonc so it is nearly always present; what is usually missing is
 * the `chart_regen_marks` table, because it arrived after the
 * `dataslope-illustrations` database already existed and a deployment only gets
 * it by re-running the migration. Naming the command is the difference between
 * a two-minute fix and an afternoon spent auditing bindings.
 */
const QUEUE_OFFLINE: Record<ChartQueueState, string> = {
  ok: "",
  unbound:
    "ILLUSTRATIONS_DB is not bound on this deployment, so the queue is read-only.",
  unreadable:
    "The review table could not be read, which usually means the migration has " +
    "not been applied to this database. Run `npm run db:migrate:illustrations:remote` " +
    "(or `:illustrations` for a local one). Until then the queue is read-only.",
};

const Ctx = createContext<ReviewContext | null>(null);

export function ChartReviewProvider({ children }: { children: React.ReactNode }) {
  const [marks, setMarks] = useState<Record<string, MarkState> | null>(null);
  const [available, setAvailable] = useState(false);
  const [state, setState] = useState<ChartQueueState>("unbound");
  const [maxNoteLength, setMaxNoteLength] = useState(500);
  const [error, setError] = useState<string | null>(null);

  // One timer per slug, so two notes typed in the same pause both save.
  const noteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const flashTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    let live = true;
    void (async () => {
      try {
        const res = await fetch("/api/admin/charts", { cache: "no-store" });
        // 401/403 is the ordinary case for a signed-out or non-admin visitor
        // on a page that is open to them: leave the queue off and say nothing.
        if (!res.ok) return;
        const data = (await res.json()) as ChartMarksPayload;
        if (!live) return;
        const next: Record<string, MarkState> = {};
        for (const m of data.marks) next[m.promptId] = markStateFrom(m);
        setMarks(next);
        setAvailable(data.available);
        // `state` predates nothing, but an older cached payload will not carry
        // it; fall back to the boolean rather than claiming a cause.
        setState(data.state ?? (data.available ? "ok" : "unbound"));
        setMaxNoteLength(data.maxNoteLength);
      } catch {
        // Network failure on an optional layer: the gallery is still the page.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  // Cleanup only: the refs are read inside the teardown, never during render.
  useEffect(
    () => () => {
      for (const t of Object.values(noteTimers.current)) clearTimeout(t);
      for (const t of flashTimers.current) clearTimeout(t);
    },
    [],
  );

  const patch = useCallback((slug: string, next: Partial<MarkState>) => {
    setMarks((prev) => ({
      ...(prev ?? {}),
      [slug]: { ...(prev?.[slug] ?? EMPTY_MARK), ...next },
    }));
  }, []);

  const save = useCallback(
    async (slug: string, body: Record<string, unknown>) => {
      patch(slug, { saving: true });
      setError(null);
      try {
        const res = await fetch("/api/admin/charts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, ...body }),
        });
        const data = (await res.json()) as { mark?: RegenMark | null; error?: string };
        if (!res.ok || !data.mark) {
          setError(data.error ?? "Couldn't save that.");
          patch(slug, { saving: false });
          return;
        }
        patch(slug, { ...markStateFrom(data.mark), justSaved: true });
        const t = setTimeout(() => patch(slug, { justSaved: false }), 1200);
        flashTimers.current.push(t);
      } catch {
        setError("Couldn't reach the server.");
        patch(slug, { saving: false });
      }
    },
    [patch],
  );

  const onToggleMark = useCallback(
    (slug: string, marked: boolean) => {
      // A pending note write would land after this and re-assert the old mark,
      // so cancel it; the note goes out with this request instead.
      clearTimeout(noteTimers.current[slug]);
      delete noteTimers.current[slug];
      setMarks((prev) => {
        const note = prev?.[slug]?.note ?? "";
        void save(slug, { marked, note });
        return prev;
      });
    },
    [save],
  );

  const onNoteChange = useCallback(
    (slug: string, note: string) => {
      patch(slug, { note });
      clearTimeout(noteTimers.current[slug]);
      noteTimers.current[slug] = setTimeout(() => {
        setMarks((prev) => {
          const state = prev?.[slug];
          if (!state || state.note === state.savedNote) return prev;
          // Typing a note is itself a flag: nobody writes "labels collide" about
          // a chart they are happy with.
          void save(slug, { marked: true, note: state.note });
          return prev;
        });
      }, NOTE_SAVE_DELAY);
    },
    [patch, save],
  );

  const onNoteCommit = useCallback(
    (slug: string) => {
      clearTimeout(noteTimers.current[slug]);
      delete noteTimers.current[slug];
      setMarks((prev) => {
        const state = prev?.[slug];
        if (!state || state.note === state.savedNote) return prev;
        void save(slug, { marked: true, note: state.note });
        return prev;
      });
    },
    [save],
  );

  const onApprove = useCallback((slug: string) => void save(slug, { approve: true }), [save]);

  const onDeleteRequestChange = useCallback(
    (slug: string, requestedAt: string | null) => patch(slug, { deleteRequestedAt: requestedAt }),
    [patch],
  );

  const value = useMemo<ReviewContext>(
    () => ({
      marks,
      available,
      state,
      maxNoteLength,
      onToggleMark,
      onNoteChange,
      onNoteCommit,
      onApprove,
      onDeleteRequestChange,
      error,
    }),
    [
      marks,
      available,
      state,
      maxNoteLength,
      onToggleMark,
      onNoteChange,
      onNoteCommit,
      onApprove,
      onDeleteRequestChange,
      error,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** The counts, plus links to outstanding charts that live on other pages.
 *
 *  `slugs` is the whole library in gallery order and `perPage` the slice size,
 *  which is all this needs to turn a slug into the URL of the page holding it.
 *  Sending 70-odd strings is cheap; sending 70-odd SVGs would not be. */
export function ChartReviewSummary({
  slugs,
  perPage,
  currentPage,
  /** URL prefix for the current ordering, so a jump link lands on the page
   *  that really holds the slug. `slugs` arrives already sorted, and the page
   *  a chart sits on depends on that ordering, so a link built against the
   *  default sort would be wrong on every other one. */
  basePath,
}: {
  slugs: string[];
  perPage: number;
  currentPage: number;
  basePath: string;
}) {
  const ctx = useContext(Ctx);
  if (!ctx?.marks) return null;

  const marks = ctx.marks;
  const known = slugs.filter((s) => marks[s]);
  const marked = known.filter((s) => marks[s].marked);
  const awaiting = known.filter((s) => !marks[s].marked && marks[s].awaitingApproval);
  const queuedForDeletion = known.filter((s) => marks[s].deleteRequestedAt);

  const pageOf = (slug: string) => Math.floor(slugs.indexOf(slug) / perPage) + 1;
  const hrefFor = (slug: string) => {
    const n = pageOf(slug);
    return `${n <= 1 ? basePath : `${basePath}/${n}`}#${slug}`;
  };
  const elsewhere = (list: string[]) => list.filter((s) => pageOf(s) !== currentPage);

  return (
    <>
      <dl className={styles.queueStats}>
        <div className={styles.stat}>
          <dt>Marked for redraw</dt>
          <dd>{marked.length}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Awaiting approval</dt>
          <dd>{awaiting.length}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Queued for deletion</dt>
          <dd>{queuedForDeletion.length}</dd>
        </div>
        {!ctx.available ? (
          <p className={styles.queueOffline}>{QUEUE_OFFLINE[ctx.state]}</p>
        ) : null}
      </dl>

      {ctx.error ? <p className={styles.queueError}>{ctx.error}</p> : null}

      {/* Only what is *not* on this page: everything else already has its
          controls a scroll away, and repeating it would be noise. */}
      {[
        { key: "marked", label: "Marked on other pages", list: elsewhere(marked) },
        { key: "awaiting", label: "Awaiting approval on other pages", list: elsewhere(awaiting) },
      ].map(({ key, label, list }) =>
        list.length > 0 ? (
          <div key={key} className={styles.queueJump}>
            <span className={styles.queueJumpLabel}>{label}</span>
            {list.map((slug) => (
              <Link key={slug} href={hrefFor(slug)} prefetch={false} className={styles.queueChip}>
                {slug}
                <span className={styles.queueChipPage}>p{pageOf(slug)}</span>
              </Link>
            ))}
          </div>
        ) : null,
      )}
    </>
  );
}

/** The per-figure row: state chip, mark toggle, approve, and the note. */
export function ChartMarkControls({ slug, title }: { slug: string; title: string }) {
  const ctx = useContext(Ctx);
  if (!ctx?.marks) return null;

  const mark = ctx.marks[slug] ?? EMPTY_MARK;
  // A fresh mark outranks a pending approval: if the redraw is still wrong and
  // has been queued again, "waiting to be looked at" is no longer the state
  // worth showing.
  const state = mark.marked ? "marked" : mark.awaitingApproval ? "awaiting" : "none";

  return (
    <div className={styles.review} data-mark-state={state}>
      <div className={styles.reviewRow}>
        <button
          type="button"
          className={`${styles.markBtn} ${mark.marked ? styles.markBtnOn : ""}`}
          onClick={() => ctx.onToggleMark(slug, !mark.marked)}
          disabled={!ctx.available || mark.saving}
          aria-pressed={mark.marked}
          title={ctx.available ? "Queue this chart for a redraw" : QUEUE_OFFLINE[ctx.state]}
        >
          {mark.saving ? (
            <Loader2 size={13} className={styles.spin} />
          ) : mark.justSaved ? (
            <Check size={13} />
          ) : (
            <RefreshCw size={13} />
          )}
          {mark.marked ? "Marked for redraw" : "Mark for redraw"}
        </button>

        {mark.awaitingApproval && !mark.marked ? (
          <>
            <span className={styles.reviewChip}>
              <Sparkles size={11} aria-hidden="true" />
              Redrawn {shortDate(mark.regeneratedAt)}
            </span>
            <button
              type="button"
              className={styles.approveBtn}
              onClick={() => ctx.onApprove(slug)}
              disabled={!ctx.available || mark.saving}
              title="The redraw is good: put this figure back to normal"
            >
              {mark.saving ? <Loader2 size={13} className={styles.spin} /> : <ThumbsUp size={13} />}
              Approve
            </button>
          </>
        ) : null}

        <input
          type="text"
          className={styles.noteInput}
          value={mark.note}
          maxLength={ctx.maxNoteLength}
          disabled={!ctx.available}
          placeholder="Optional note: what is wrong with it"
          title={
            "Optional. The brief for the redraw: what is wrong, not how to fix it. " +
            "Typing here also marks this chart; marking without a note is fine and " +
            "stores nothing."
          }
          aria-label={`Redraw note for ${title}`}
          onChange={(e) => ctx.onNoteChange(slug, e.target.value)}
          onBlur={() => ctx.onNoteCommit(slug)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
    </div>
  );
}

/**
 * The deletion-request control for one figure, wired to the queue.
 *
 * Separate from `ChartMarkControls` and deliberately more forgiving: that
 * component returns null until the marks fetch resolves and for anyone who is
 * not an admin, which is right for a redraw queue nobody else can write to.
 * This one renders regardless and disables itself instead, because a control
 * that silently is not there reads as a missing feature rather than as a
 * permission, and because the button is the only place the outstanding request
 * is visible on the figure itself.
 */
export function ChartDeleteControls({
  slug,
  usedBy,
}: {
  slug: string;
  usedBy: string[];
}) {
  const ctx = useContext(Ctx);
  const mark = ctx?.marks?.[slug];
  return (
    <ChartDelete
      slug={slug}
      usedBy={usedBy}
      requested={Boolean(mark?.deleteRequestedAt)}
      requestedAt={mark?.deleteRequestedAt ?? null}
      available={Boolean(ctx?.available)}
      unavailableReason={QUEUE_OFFLINE[ctx?.state ?? "unbound"]}
      onChange={ctx?.onDeleteRequestChange ?? (() => {})}
    />
  );
}
