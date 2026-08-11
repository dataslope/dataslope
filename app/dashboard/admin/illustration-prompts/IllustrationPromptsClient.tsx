"use client";

/**
 * Interactive shell for the `/dashboard/admin/illustration-prompts` review gallery.
 *
 * Three things shape this component:
 *
 * 1. **Admin-only.** It holds no data of its own; everything comes from
 *    `GET /api/admin/illustration-prompts`, which enforces the admin check
 *    server-side. A signed-out visitor sees a sign-in prompt, a signed-in
 *    non-admin sees an access-denied notice, and neither ever receives the
 *    prompt corpus (the page shell is static and empty).
 *
 * 2. **A grid of cut-outs.** One card per illustration, several per row, and
 *    the only image shown is the background-removed WebP the site actually
 *    serves. It gets no backdrop of its own, so the page color shows through
 *    its alpha and the docked theme pill doubles as the judgement tool: a
 *    cut-out that only reads on one background is exactly what this page is
 *    for. Clicking one opens the raw file in a new tab, at full size.
 *
 * 3. **A regeneration queue.** Each card can be marked "redraw this" with a
 *    note ("too busy, the small parcels came out as smears"), persisted through
 *    `PUT` on the same endpoint into D1 `dataslope-illustrations` →
 *    `illustration_regen_marks`. A later regeneration run reads that table and
 *    writes the prompt again from scratch against the note, so the note is a
 *    brief for a new illustration rather than an addition to the old prompt.
 *    See agent-outputs/20260803-0900-illustration-regeneration-queue.md.
 *
 * Theme is the shared site one (ThemePillToggle → siteTheme.ts → `.dark` on
 * <html>), not a page-local toggle, so the palette matches every other surface
 * and survives a reload.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ORDERINGS,
  ORDERING_LABELS,
  isOrdering,
  orderBy,
  type Ordering,
} from "@/lib/review/ordering";
import {
  Check,
  Copy,
  ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  ThumbsUp,
  TriangleAlert,
} from "lucide-react";
import Link from "@/app/_components/Link";
import { useSession } from "@/lib/auth/client";
import type {
  GalleryEntry,
  IllustrationGallery,
} from "@/app/api/admin/illustration-prompts/route";
import { isAwaitingApproval, type RegenMark } from "@/lib/illustrations/regenMarks";
import styles from "./illustration-prompts.module.css";

/** Cards per page. One image per card now (the cut-out), laid out in a grid,
 *  so a page holds far more than the old two-image stack did while staying a
 *  bounded number of bytes. */
const PAGE_SIZE = 36;

/** How long typing has to pause before the note is written. Long enough that a
 *  sentence is one request, short enough that walking away mid-review still
 *  leaves the note stored. */
const NOTE_SAVE_DELAY = 700;

/** Local, possibly-unsaved state for one card's queue entry. */
interface MarkState {
  marked: boolean;
  /** What is in the input right now. */
  note: string;
  /** What the server last confirmed, so blur can skip a no-op write. */
  savedNote: string;
  /** Redrawn since anyone last signed it off: the card wants a look. */
  awaitingApproval: boolean;
  /** When the art was last redrawn (ISO-8601 UTC), null if never. */
  regeneratedAt: string | null;
  saving: boolean;
  /** Set briefly after a successful write, to flash a tick. */
  justSaved: boolean;
}

/** Which subset of the gallery is shown. `regenerated` is the review queue for
 *  redraws that have landed but nobody has looked at yet. */
type Filter = "all" | "marked" | "regenerated";

/** How the gallery is ordered. `category` is the corpus order the prompts file
 *  and its headings already impose, so it stays the default and is dropped
 *  from the URL; the rest come from lib/review/ordering.ts, shared with the
 *  chart gallery so the two agree on what each ordering means. */
type Sort = "category" | Ordering;

const SORTS: Sort[] = ["category", ...ORDERINGS];

const SORT_LABELS: Record<Sort, string> = { category: "Category", ...ORDERING_LABELS };

const PAGE_PARAM = "page";
const FILTER_PARAM = "filter";
const SORT_PARAM = "sort";

/** The page (0-based) named by a URL's `?page=`, or 0 when absent/invalid. */
function pageFromSearch(search: string): number {
  const raw = new URLSearchParams(search).get(PAGE_PARAM);
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 ? n - 1 : 0;
}

/** The filter named by a URL's `?filter=`, defaulting to the whole gallery. */
function filterFromSearch(search: string): Filter {
  const raw = new URLSearchParams(search).get(FILTER_PARAM);
  return raw === "marked" || raw === "regenerated" ? raw : "all";
}

/** The ordering named by a URL's `?sort=`, defaulting to the corpus order. */
function sortFromSearch(search: string): Sort {
  const raw = new URLSearchParams(search).get(SORT_PARAM) ?? "";
  return isOrdering(raw) ? raw : "category";
}

/** The current URL carrying a page (1-based), filter and sort, each dropped at
 *  its default so the plain gallery keeps a clean canonical URL. Hash is
 *  preserved: card ids are anchors on this page. */
function urlFor(page: number, filter: Filter, sort: Sort): string {
  const url = new URL(window.location.href);
  if (page > 0) url.searchParams.set(PAGE_PARAM, String(page + 1));
  else url.searchParams.delete(PAGE_PARAM);
  if (filter !== "all") url.searchParams.set(FILTER_PARAM, filter);
  else url.searchParams.delete(FILTER_PARAM);
  if (sort !== "category") url.searchParams.set(SORT_PARAM, sort);
  else url.searchParams.delete(SORT_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}

/** "3 Aug 2026", or "" when the illustration has never been committed. Fixed
 *  to en-GB rather than the visitor's locale so the column reads the same for
 *  everyone reviewing the same corpus. */
function formatCreated(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const EMPTY_MARK: MarkState = {
  marked: false,
  note: "",
  savedNote: "",
  awaitingApproval: false,
  regeneratedAt: null,
  saving: false,
  justSaved: false,
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
  };
}

/** "Aug 3", for the "regenerated <when>" line on a card awaiting approval. */
function shortDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Card ──────────────────────────────────────────────────────────────────

/** The cut-out, linked to itself so a click opens the raw image in a new tab.
 *  No backdrop: the page background is what the alpha is judged against. */
function CutoutImage({ entry }: { entry: GalleryEntry }) {
  if (!entry.cutout) {
    return (
      <div className={styles.imagePending}>
        {entry.hasOriginal ? (
          <>
            <TriangleAlert size={15} aria-hidden="true" />
            <span>Generated, but no cut-out</span>
          </>
        ) : (
          <>
            <ImageIcon size={15} aria-hidden="true" />
            <span>Not generated yet</span>
          </>
        )}
      </div>
    );
  }
  return (
    <a
      className={styles.imageLink}
      href={entry.cutout.src}
      target="_blank"
      rel="noreferrer"
      title="Open the full-size image in a new tab"
    >
      {/* Plain <img>: these are pre-encoded WebP served straight from
          public/images, so next/image would only add a proxy hop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.cutout.src}
        width={entry.cutout.width}
        height={entry.cutout.height}
        alt={`${entry.title}, background removed`}
        className={styles.imageCutout}
        loading="lazy"
        decoding="async"
      />
    </a>
  );
}

function PromptCard({
  entry,
  mark,
  maxNoteLength,
  marksAvailable,
  copiedKey,
  onCopy,
  onNoteChange,
  onNoteCommit,
  onToggleMark,
  onApprove,
}: {
  entry: GalleryEntry;
  mark: MarkState;
  maxNoteLength: number;
  marksAvailable: boolean;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onNoteCommit: (id: string) => void;
  onToggleMark: (id: string, marked: boolean) => void;
  onApprove: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const promptKey = `${entry.id}:prompt`;

  // A fresh mark outranks a pending approval: if the redraw is still wrong and
  // it has been queued again, "waiting to be looked at" is no longer the state
  // worth showing.
  // State is carried on the artwork's own dashed frame rather than by tinting
  // a card, because there is no card any more: the frame is already the one
  // piece of chrome each item has, and coloring it puts the signal on the
  // thing being judged. The chip above it says the same in words.
  const state = mark.marked
    ? styles.itemMarked
    : mark.awaitingApproval
      ? styles.itemRegenerated
      : "";

  return (
    <figure id={entry.id} className={`${styles.item} ${state}`}>
      {/* The state chip sits on the artwork rather than above it: with no card
          to hold a status line, a separate row would either add a permanent
          gap over every unmarked image or let the images fall out of line
          across a row. */}
      <div className={styles.frame}>
        <CutoutImage entry={entry} />
        {mark.marked ? (
          <span className={`${styles.stateChip} ${styles.stateChipMarked}`}>
            <RefreshCw size={11} aria-hidden="true" />
            Queued for redraw
          </span>
        ) : mark.awaitingApproval ? (
          <span className={`${styles.stateChip} ${styles.stateChipRegen}`}>
            <Sparkles size={11} aria-hidden="true" />
            Redrawn {shortDate(mark.regeneratedAt)}
          </span>
        ) : null}
      </div>

      <div className={styles.meta}>
        <p className={styles.itemTitle}>
          {entry.title}
          {entry.mascot ? <span className={styles.badgeMuted}>marmot</span> : null}
        </p>
        {/* The slug is the handle every pipeline script takes as `--only`, so
            it sits directly under the name where it can be read off and
            selected in one gesture. */}
        <code className={styles.file}>{entry.file}</code>
        <p className={styles.created}>
          {entry.createdAt
            ? `Created ${formatCreated(entry.createdAt)}`
            : "Not committed yet"}
        </p>
        <a className={styles.usage} href={entry.href}>
          <span className={styles.usageCourse}>{entry.courseTitle}</span>
          <span className={styles.usageRoute}>{entry.route}</span>
        </a>
        <p className={expanded ? styles.prompt : styles.promptClamped}>
          {entry.prompt}
        </p>
        <button
          type="button"
          className={styles.linkBtn}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Show less" : "Show full prompt"}
        </button>
      </div>

      {/* The regeneration queue controls. Disabled wholesale when the D1
          binding is missing, so the gallery still reviews fine read-only. */}
      <div className={styles.regen}>
        {mark.awaitingApproval && !mark.marked ? (
          <button
            type="button"
            className={styles.approveBtn}
            onClick={() => onApprove(entry.id)}
            disabled={!marksAvailable || mark.saving}
            title="The redraw is good: put this card back to normal"
          >
            {mark.saving ? (
              <Loader2 size={13} className={styles.spin} />
            ) : (
              <ThumbsUp size={13} />
            )}
            Approve
          </button>
        ) : null}
        <div className={styles.regenRow}>
          <button
            type="button"
            className={`${styles.markBtn} ${mark.marked ? styles.markBtnOn : ""}`}
            onClick={() => onToggleMark(entry.id, !mark.marked)}
            disabled={!marksAvailable || mark.saving}
            aria-pressed={mark.marked}
            title={
              marksAvailable
                ? "Queue this illustration for regeneration"
                : "Regeneration queue unavailable (ILLUSTRATIONS_DB not bound)"
            }
          >
            {mark.saving ? (
              <Loader2 size={13} className={styles.spin} />
            ) : mark.justSaved ? (
              <Check size={13} />
            ) : (
              <RefreshCw size={13} />
            )}
            {mark.marked ? "Marked for regeneration" : "Mark for regeneration"}
          </button>
          <button
            type="button"
            className={styles.copyPrompt}
            onClick={() => onCopy(promptKey, entry.prompt)}
            aria-label={copiedKey === promptKey ? "Prompt copied" : "Copy prompt"}
          >
            {copiedKey === promptKey ? <Check size={14} /> : <Copy size={14} />}
            {copiedKey === promptKey ? "Copied" : "Copy prompt"}
          </button>
        </div>
        <input
          type="text"
          className={styles.noteInput}
          value={mark.note}
          maxLength={maxNoteLength}
          disabled={!marksAvailable}
          placeholder="Optional note: what the new illustration should be"
          title={
            "Optional. Typing here also marks this illustration. The note is the brief " +
            "for a prompt rewritten from scratch, not an addition to the one above; any " +
            "animal in the old prompt is kept. Marking without a note is fine and stores " +
            "nothing."
          }
          aria-label={`Regeneration note for ${entry.title}`}
          onChange={(e) => onNoteChange(entry.id, e.target.value)}
          onBlur={() => onNoteCommit(entry.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      </div>
    </figure>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

function Notice({ children }: { children: React.ReactNode }) {
  return <div className={styles.notice}>{children}</div>;
}

export function IllustrationPromptsClient() {
  const { data: session, isPending: sessionPending } = useSession();

  const [gallery, setGallery] = useState<IllustrationGallery | null>(null);
  const [marks, setMarks] = useState<Record<string, MarkState>>({});
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("category");
  // 0-based internally, 1-based in the URL (`?page=3`).
  const [page, setPage] = useState(0);

  // The saved state, mirrored for callbacks that outlive the render that
  // created them (the debounced note save, the mark button's read of the
  // input). Kept in an effect so it tracks what was actually committed.
  const marksRef = useRef(marks);
  useEffect(() => {
    marksRef.current = marks;
  }, [marks]);

  // Per-card debounce timers for the note autosave.
  const noteTimers = useRef<Map<string, number>>(new Map());
  const cancelNoteSave = useCallback((id: string) => {
    const pending = noteTimers.current.get(id);
    if (pending === undefined) return;
    window.clearTimeout(pending);
    noteTimers.current.delete(id);
  }, []);

  // Timers that clear the transient "copied"/"saved" flashes, cancelled on
  // unmount so a state update can't land on a gone component.
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const flashes = timers.current;
    const notes = noteTimers.current;
    return () => {
      for (const t of flashes) window.clearTimeout(t);
      for (const t of notes.values()) window.clearTimeout(t);
    };
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDenied(false);
    try {
      const res = await fetch("/api/admin/illustration-prompts");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) setDenied(true);
        else setError("Couldn't load the illustrations. Please try again.");
        setGallery(null);
      } else {
        const data = (await res.json()) as IllustrationGallery;
        setGallery(data);
        setMarks(
          Object.fromEntries(data.marks.map((m) => [m.promptId, markStateFrom(m)])),
        );
      }
    } catch {
      setError("Couldn't load the illustrations. Please try again.");
      setGallery(null);
    }
    setLoading(false);
  }, []);

  // Load once per signed-in user, NOT once per `session` object.
  // `useSession` re-resolves when the tab regains focus (coming back from an
  // image opened in a new tab, for one), handing back a fresh object every
  // time; keying the effect off that identity re-ran the whole fetch, threw
  // the rendered grid away for a "Loading illustrations…" notice, and lost the
  // scroll position. Keying off the user id makes those refreshes inert.
  const loadedForUser = useRef<string | null>(null);
  useEffect(() => {
    if (sessionPending) return;
    const userId = session?.user.id ?? null;
    if (!userId) {
      loadedForUser.current = null; // signed out: allow a reload on next sign-in
      return;
    }
    if (loadedForUser.current === userId) return;
    loadedForUser.current = userId;
    void load();
  }, [sessionPending, session, load]);

  const onCopy = useCallback(
    (key: string, text: string) => {
      void navigator.clipboard
        ?.writeText(text)
        .then(() => {
          setCopiedKey(key);
          later(() => setCopiedKey((c) => (c === key ? null : c)), 1500);
        })
        .catch(() => {
          // Clipboard unavailable (e.g. insecure context), ignore.
        });
    },
    [later],
  );

  /**
   * Persist one card's queue row. The note travels with the mark on every
   * write, so whichever control the reviewer touched, both end up stored.
   *
   * Both values are passed in rather than read from `marks`: the debounced
   * note save fires after the state that scheduled it has moved on, and a
   * closure over `marks` would write whatever was there a keystroke ago.
   */
  const save = useCallback(
    async (id: string, marked: boolean, note: string) => {
      setMarks((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? EMPTY_MARK), marked, note, saving: true },
      }));
      try {
        const res = await fetch("/api/admin/illustration-prompts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, marked, note }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { mark } = (await res.json()) as { mark: RegenMark };
        setMarks((prev) => {
          const cur = prev[id];
          const next = { ...markStateFrom(mark), justSaved: true };
          // Keep what is in the input if the reviewer kept typing while this
          // request was in flight; the next save will carry it.
          if (cur && cur.note !== note) next.note = cur.note;
          return { ...prev, [id]: next };
        });
        later(
          () =>
            setMarks((prev) =>
              prev[id] ? { ...prev, [id]: { ...prev[id], justSaved: false } } : prev,
            ),
          1200,
        );
      } catch {
        // Roll the optimistic flip back rather than leaving the card claiming
        // a mark the queue never took.
        setMarks((prev) => ({
          ...prev,
          [id]: { ...(prev[id] ?? EMPTY_MARK), marked: !marked, saving: false },
        }));
        setError("Couldn't save that mark. Please try again.");
      }
    },
    [later],
  );

  /** Toggle from the mark button, carrying whatever is in the note input. */
  const onToggleMark = useCallback(
    (id: string, marked: boolean) => {
      cancelNoteSave(id);
      void save(id, marked, marksRef.current[id]?.note ?? "");
    },
    [save, cancelNoteSave],
  );

  /**
   * Typing guidance about an illustration IS marking it: nobody writes "the
   * star points are mushed" about a picture they are happy with. The card
   * flips to marked on the first keystroke (so the tint confirms it landed),
   * and the row is written once typing pauses, without waiting for a blur that
   * may never come.
   */
  const onNoteChange = useCallback(
    (id: string, note: string) => {
      const marked = note.trim().length > 0 || (marksRef.current[id]?.marked ?? false);
      setMarks((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? EMPTY_MARK), note, marked },
      }));
      cancelNoteSave(id);
      noteTimers.current.set(
        id,
        window.setTimeout(() => {
          noteTimers.current.delete(id);
          void save(id, marked, note);
        }, NOTE_SAVE_DELAY),
      );
    },
    [save, cancelNoteSave],
  );

  /** Blur (or Enter) writes immediately instead of waiting out the debounce. */
  const onNoteCommit = useCallback(
    (id: string) => {
      const cur = marksRef.current[id];
      if (!cur || (!noteTimers.current.has(id) && cur.note === cur.savedNote)) return;
      cancelNoteSave(id);
      void save(id, cur.marked, cur.note);
    },
    [save, cancelNoteSave],
  );

  /** Sign off a redraw: the card loses its tint and goes back to normal. */
  const onApprove = useCallback(
    async (id: string) => {
      setMarks((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? EMPTY_MARK), saving: true },
      }));
      try {
        const res = await fetch("/api/admin/illustration-prompts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, approve: true }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { mark } = (await res.json()) as { mark: RegenMark | null };
        setMarks((prev) => ({
          ...prev,
          [id]: mark
            ? markStateFrom(mark)
            : { ...(prev[id] ?? EMPTY_MARK), saving: false },
        }));
      } catch {
        setMarks((prev) => ({
          ...prev,
          [id]: { ...(prev[id] ?? EMPTY_MARK), saving: false },
        }));
        setError("Couldn't approve that image. Please try again.");
      }
    },
    [],
  );

  const counts = useMemo(() => {
    const all = Object.values(marks);
    return {
      marked: all.filter((m) => m.marked).length,
      // A card queued again is counted as queued, not as waiting for a look,
      // matching how the card itself is tinted.
      regenerated: all.filter((m) => m.awaitingApproval && !m.marked).length,
    };
  }, [marks]);

  const visible = useMemo(() => {
    const all = gallery?.entries ?? [];
    if (filter === "marked") return all.filter((e) => marks[e.id]?.marked);
    if (filter === "regenerated") {
      return all.filter((e) => marks[e.id]?.awaitingApproval && !marks[e.id]?.marked);
    }
    return all;
  }, [gallery, marks, filter]);

  /** Filtered, then ordered. `orderBy` copies, which matters because `visible`
   *  is the fetched array itself when no filter is active. */
  const ordered = useMemo(
    () =>
      sort === "category"
        ? visible
        : orderBy(visible, sort, (e) => ({
            id: e.id,
            createdAt: e.createdAt,
            group: e.courseTitle,
          })),
    [visible, sort],
  );

  const pageCount = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);

  // Group whatever landed on the current page, so category headings still
  // appear but only for what is actually shown.
  const groups = useMemo(() => {
    const slice = ordered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    const byLabel = new Map<string, GalleryEntry[]>();
    for (const entry of slice) {
      const list = byLabel.get(entry.categoryLabel);
      if (list) list.push(entry);
      else byLabel.set(entry.categoryLabel, [entry]);
    }
    return [...byLabel.entries()];
  }, [ordered, current]);

  // The page and filter live in the URL (`?page=3&filter=regenerated`), so the
  // view survives a reload, can be bookmarked or shared ("here are the ones
  // waiting on you"), and comes back with the Back button.
  //
  // Read on mount rather than through `useSearchParams`: this page is
  // prerendered (`force-static`), where that hook forces a Suspense boundary
  // and reads empty params at build time anyway. Parsing `window.location`
  // after hydration sidesteps both, at the cost of one extra render.
  useEffect(() => {
    const adopt = () => {
      setPage(pageFromSearch(window.location.search));
      setFilter(filterFromSearch(window.location.search));
      setSort(sortFromSearch(window.location.search));
    };
    adopt();
    window.addEventListener("popstate", adopt);
    return () => window.removeEventListener("popstate", adopt);
  }, []);

  // A URL can name a page past the end (`?page=99`, or a filter that shrank the
  // list). Rendering already clamps; this settles the state and the URL onto
  // the page actually being shown, so a reload or a share is honest.
  useEffect(() => {
    if (!gallery || page <= pageCount - 1) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clamping to the real page count, which is only known after the data loads
    setPage(pageCount - 1);
    window.history.replaceState(null, "", urlFor(pageCount - 1, filter, sort));
  }, [gallery, page, pageCount, filter, sort]);

  const goTo = useCallback(
    (next: number) => {
      setPage(next);
      // pushState, so Back walks the pages a reviewer actually visited; the
      // popstate listener above puts the state back in step.
      window.history.pushState(null, "", urlFor(next, filter, sort));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [filter, sort],
  );

  /** Switch filters, back to page 1. replaceState rather than pushState: this
   *  is narrowing the view, not navigating within it, and Back should leave the
   *  gallery rather than undo a chip. */
  const selectFilter = useCallback(
    (next: Filter) => {
      setFilter(next);
      setPage(0);
      window.history.replaceState(null, "", urlFor(0, next, sort));
    },
    [sort],
  );

  /** Switch orderings, back to page 1. Same reasoning as the filter: reordering
   *  is a change of view rather than a step through it. */
  const selectSort = useCallback(
    (next: Sort) => {
      setSort(next);
      setPage(0);
      window.history.replaceState(null, "", urlFor(0, filter, next));
    },
    [filter],
  );

  const body = () => {
    // Order matters: a *settled* signed-out or denied session replaces the
    // gallery, but a pending one never does. `useSession` goes pending again
    // whenever the tab regains focus, and swapping the grid for a spinner on
    // that would throw away the reader's scroll position for nothing.
    if (!sessionPending && !session) {
      return (
        <Notice>
          <p>This page is for site admins.</p>
          <Link className={styles.noticeCta} href="/sign-in">
            Sign in
          </Link>
        </Notice>
      );
    }
    if (denied) {
      return (
        <Notice>
          <p>You don&apos;t have admin access.</p>
          <p className={styles.noticeMuted}>
            {session ? `Signed in as ${session.user.email}. ` : ""}Ask an existing
            admin to grant you access.
          </p>
        </Notice>
      );
    }
    if (!gallery) {
      if (sessionPending || loading) return <Notice>Loading illustrations…</Notice>;
      return (
        <Notice>
          <p>{error ?? "Couldn't load the illustrations."}</p>
          <button type="button" className={styles.noticeCta} onClick={() => void load()}>
            Try again
          </button>
        </Notice>
      );
    }

    return (
      <>
        {/* The page's prose lives in the dashboard's <AdminPageHeader> (see
            page.tsx); what belongs here is the shape of the corpus, as figures
            you can scan rather than a paragraph you have to read. */}
        <header className={styles.header}>
          <dl className={styles.stats}>
            <div className={styles.stat}>
              <dt>Illustrations</dt>
              <dd>{gallery.totalIllustrations}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Courses</dt>
              <dd>{gallery.totalCourses}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Marked</dt>
              <dd>{counts.marked}</dd>
            </div>
            <div className={styles.stat}>
              <dt>Awaiting approval</dt>
              <dd>{counts.regenerated}</dd>
            </div>
          </dl>
          {!gallery.marksAvailable ? (
            <p className={styles.warn}>
              <TriangleAlert size={14} aria-hidden="true" /> The regeneration queue
              is unavailable (<code>ILLUSTRATIONS_DB</code> is not bound). Reviewing
              works, marking does not.
            </p>
          ) : null}
          {error ? <p className={styles.warn}>{error}</p> : null}
        </header>

        {/* Clicking the active chip clears it, so each is a toggle even though
            the three states are exclusive. */}
        <div className={styles.toolbar}>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === "marked" ? styles.filterBtnOn : ""}`}
            onClick={() => selectFilter(filter === "marked" ? "all" : "marked")}
            aria-pressed={filter === "marked"}
          >
            Marked for regeneration
            <span className={styles.filterCount}>{counts.marked}</span>
          </button>
          <button
            type="button"
            className={`${styles.filterBtn} ${filter === "regenerated" ? styles.filterBtnGreenOn : ""}`}
            onClick={() =>
              selectFilter(filter === "regenerated" ? "all" : "regenerated")
            }
            aria-pressed={filter === "regenerated"}
          >
            Regenerated, awaiting approval
            <span className={styles.filterCount}>{counts.regenerated}</span>
          </button>
          <span className={styles.toolbarNote}>
            Marks are stored in D1 <code>dataslope-illustrations</code> ·{" "}
            <code>illustration_regen_marks</code>
          </span>
        </div>

        {/* A second row rather than more chips in the first: the filters narrow
            *what* is shown and these change the *order*, and mixing the two in
            one strip made both read as filters. */}
        <div className={styles.sortBar}>
          <span className={styles.sortLabel}>Sort by</span>
          {SORTS.map((key) => (
            <button
              key={key}
              type="button"
              className={`${styles.sortBtn} ${sort === key ? styles.sortBtnOn : ""}`}
              onClick={() => selectSort(key)}
              aria-pressed={sort === key}
            >
              {SORT_LABELS[key]}
            </button>
          ))}
        </div>

        {ordered.length === 0 ? (
          <p className={styles.empty}>
            {filter === "marked"
              ? "Nothing is marked for regeneration."
              : filter === "regenerated"
                ? "Nothing is waiting for approval."
                : "No illustration prompts found."}
          </p>
        ) : (
          groups.map(([label, groupEntries]) => (
            <section key={label} className={styles.section}>
              <h2 className={styles.sectionHeading}>
                {label}
                <span className={styles.sectionCount}>
                  {groupEntries.length} illustration
                  {groupEntries.length === 1 ? "" : "s"}
                </span>
              </h2>
              <div className={styles.grid}>
                {groupEntries.map((entry) => (
                  <PromptCard
                    key={entry.id}
                    entry={entry}
                    mark={marks[entry.id] ?? EMPTY_MARK}
                    maxNoteLength={gallery.maxNoteLength}
                    marksAvailable={gallery.marksAvailable}
                    copiedKey={copiedKey}
                    onCopy={onCopy}
                    onNoteChange={onNoteChange}
                    onNoteCommit={onNoteCommit}
                    onToggleMark={onToggleMark}
                    onApprove={(id) => void onApprove(id)}
                  />
                ))}
              </div>
            </section>
          ))
        )}

        {pageCount > 1 ? (
          <nav className={styles.pager} aria-label="Illustration pages">
            <button
              type="button"
              className={styles.pagerBtn}
              onClick={() => goTo(current - 1)}
              disabled={current === 0}
            >
              ← Previous
            </button>
            <span className={styles.pagerStatus}>
              Page {current + 1} of {pageCount}
              <span className={styles.pagerRange}>
                {" "}
                · {current * PAGE_SIZE + 1}–
                {Math.min((current + 1) * PAGE_SIZE, ordered.length)} of{" "}
                {ordered.length}
              </span>
            </span>
            <button
              type="button"
              className={styles.pagerBtn}
              onClick={() => goTo(current + 1)}
              disabled={current >= pageCount - 1}
            >
              Next →
            </button>
          </nav>
        ) : null}

        {/* Every page as its own link, so a reviewer working through the queue
            can jump straight to where they left off instead of stepping through
            with Next. Real hrefs, so they can be opened in a new tab or copied;
            the click is intercepted to keep the SPA's pushState behaviour. */}
        {pageCount > 1 ? (
          <nav className={styles.pageList} aria-label="Jump to illustration page">
            {Array.from({ length: pageCount }, (_, i) => (
              <a
                key={i}
                href={urlFor(i, filter, sort)}
                className={
                  i === current
                    ? `${styles.pageListLink} ${styles.pageListLinkCurrent}`
                    : styles.pageListLink
                }
                aria-current={i === current ? "page" : undefined}
                onClick={(e) => {
                  // Let modified clicks (new tab, new window, download) through.
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
                    return;
                  e.preventDefault();
                  goTo(i);
                }}
              >
                {i + 1}
              </a>
            ))}
          </nav>
        ) : null}
      </>
    );
  };

  return (
    // `styles.page` still paints the site's own backgrounds (#ffffff / #121212)
    // rather than inheriting the dashboard's, because judging a cut-out means
    // seeing it on the exact surface the lesson serves it on. The dashboard's
    // main background is a near-neighbour (#161616 in dark), which would make
    // this page quietly lie. The theme pill it used to dock itself is now in
    // the shell's top bar.
    <div className={styles.page}>
      <div className={styles.inner}>{body()}</div>
    </div>
  );
}
