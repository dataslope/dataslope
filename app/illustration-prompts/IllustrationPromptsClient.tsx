"use client";

/**
 * Interactive shell for the `/illustration-prompts` review gallery.
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
 *    serves. It gets no backdrop of its own, so the page colour shows through
 *    its alpha and the docked theme pill doubles as the judgement tool: a
 *    cut-out that only reads on one background is exactly what this page is
 *    for. Clicking one opens the raw file in a new tab, at full size.
 *
 * 3. **A regeneration queue.** Each card can be marked "redraw this" with a
 *    note ("use a simpler illustration"), persisted through `PUT` on the same
 *    endpoint into D1 `dataslope-illustrations` → `illustration_regen_marks`.
 *    A later regeneration run reads that table. See
 *    agent-outputs/20260803-0900-illustration-regeneration-queue.md.
 *
 * Theme is the shared site one (ThemePillToggle → siteTheme.ts → `.dark` on
 * <html>), not a page-local toggle, so the palette matches every other surface
 * and survives a reload.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, ImageIcon, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "@/app/_components/Link";
import { ThemePillToggle } from "@/app/_components/ThemePillToggle";
import { useSession } from "@/lib/auth/client";
import type {
  GalleryEntry,
  IllustrationGallery,
} from "@/app/api/admin/illustration-prompts/route";
import type { RegenMark } from "@/lib/illustrations/regenMarks";
import styles from "./illustration-prompts.module.css";

/** Cards per page. One image per card now (the cut-out), laid out in a grid,
 *  so a page holds far more than the old two-image stack did while staying a
 *  bounded number of bytes. */
const PAGE_SIZE = 36;

/** Local, possibly-unsaved state for one card's queue entry. */
interface MarkState {
  marked: boolean;
  /** What is in the input right now. */
  note: string;
  /** What the server last confirmed, so blur can skip a no-op write. */
  savedNote: string;
  saving: boolean;
  /** Set briefly after a successful write, to flash a tick. */
  justSaved: boolean;
}

const EMPTY_MARK: MarkState = {
  marked: false,
  note: "",
  savedNote: "",
  saving: false,
  justSaved: false,
};

function markStateFrom(mark: RegenMark): MarkState {
  return {
    marked: mark.marked,
    note: mark.note,
    savedNote: mark.note,
    saving: false,
    justSaved: false,
  };
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
  onSave,
}: {
  entry: GalleryEntry;
  mark: MarkState;
  maxNoteLength: number;
  marksAvailable: boolean;
  copiedKey: string | null;
  onCopy: (key: string, text: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onSave: (id: string, marked: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const promptKey = `${entry.id}:prompt`;
  // Trim the generic tail ("… illustration"/"… schematic") for a tidy badge.
  const styleLabel = entry.style.replace(/ (illustration|schematic)$/i, "");

  return (
    <figure
      id={entry.id}
      className={`${styles.card} ${mark.marked ? styles.cardMarked : ""}`}
    >
      <CutoutImage entry={entry} />

      <div className={styles.cardTop}>
        <code className={styles.file}>{entry.file}</code>
        <span className={styles.badges}>
          <span className={`${styles.badge} ${styles.badgeAccent}`}>{styleLabel}</span>
          {entry.mascot ? (
            <span className={`${styles.badge} ${styles.badgeMuted}`}>marmot</span>
          ) : null}
        </span>
      </div>

      <p className={styles.cardTitle}>{entry.title}</p>
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

      <div className={styles.usages}>
        <span className={styles.usagesLabel}>Used on</span>
        <a className={styles.usage} href={entry.href}>
          <span className={styles.usageCourse}>{entry.courseTitle}</span> ·{" "}
          {entry.route} →
        </a>
      </div>

      {/* The regeneration queue controls. Disabled wholesale when the D1
          binding is missing, so the gallery still reviews fine read-only. */}
      <div className={styles.regen}>
        <div className={styles.regenRow}>
          <button
            type="button"
            className={`${styles.markBtn} ${mark.marked ? styles.markBtnOn : ""}`}
            onClick={() => onSave(entry.id, !mark.marked)}
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
          placeholder="Extra prompt for the redraw, e.g. use a simpler illustration"
          aria-label={`Regeneration note for ${entry.title}`}
          onChange={(e) => onNoteChange(entry.id, e.target.value)}
          onBlur={() => {
            if (mark.note !== mark.savedNote) onSave(entry.id, mark.marked);
          }}
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
  const [markedOnly, setMarkedOnly] = useState(false);
  const [page, setPage] = useState(0);

  // Timers that clear the transient "copied"/"saved" flashes, cancelled on
  // unmount so a state update can't land on a gone component.
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load on mount; the fetch's setState is intentional
    if (!sessionPending && session) void load();
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

  const onNoteChange = useCallback((id: string, note: string) => {
    setMarks((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_MARK), note } }));
  }, []);

  /** Persist one card's queue row. The note always travels with the mark, so
   *  toggling the button also saves whatever was typed but not yet blurred. */
  const onSave = useCallback(
    async (id: string, marked: boolean) => {
      const note = marks[id]?.note ?? "";
      setMarks((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? EMPTY_MARK), marked, saving: true },
      }));
      try {
        const res = await fetch("/api/admin/illustration-prompts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, marked, note }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const { mark } = (await res.json()) as { mark: RegenMark };
        setMarks((prev) => ({
          ...prev,
          [id]: { ...markStateFrom(mark), justSaved: true },
        }));
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
    [marks, later],
  );

  const markedCount = useMemo(
    () => Object.values(marks).filter((m) => m.marked).length,
    [marks],
  );

  const visible = useMemo(() => {
    const all = gallery?.entries ?? [];
    return markedOnly ? all.filter((e) => marks[e.id]?.marked) : all;
  }, [gallery, marks, markedOnly]);

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);

  // Group whatever landed on the current page, so category headings still
  // appear but only for what is actually shown.
  const groups = useMemo(() => {
    const slice = visible.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
    const byLabel = new Map<string, GalleryEntry[]>();
    for (const entry of slice) {
      const list = byLabel.get(entry.categoryLabel);
      if (list) list.push(entry);
      else byLabel.set(entry.categoryLabel, [entry]);
    }
    return [...byLabel.entries()];
  }, [visible, current]);

  const goTo = useCallback((next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const body = () => {
    if (sessionPending) return <Notice>Loading…</Notice>;
    if (!session) {
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
            Signed in as {session.user.email}. Ask an existing admin to grant you
            access.
          </p>
        </Notice>
      );
    }
    if (loading) return <Notice>Loading illustrations…</Notice>;
    if (!gallery) {
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
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <h1 className={styles.title}>Illustration prompts</h1>
          </div>
          <p className={styles.subtitle}>
            Every generated illustration as the site serves it: the
            background-removed WebP over the live page background. Flip the theme
            to check a cut-out reads on both, click one to open the full-size file,
            and mark whatever needs redrawing with a note for the next run.{" "}
            <span className={styles.count}>{gallery.totalIllustrations}</span>{" "}
            illustration{gallery.totalIllustrations === 1 ? "" : "s"} across{" "}
            <span className={styles.count}>{gallery.totalCourses}</span> course
            {gallery.totalCourses === 1 ? "" : "s"}.
          </p>
          {!gallery.marksAvailable ? (
            <p className={styles.warn}>
              <TriangleAlert size={14} aria-hidden="true" /> The regeneration queue
              is unavailable (<code>ILLUSTRATIONS_DB</code> is not bound). Reviewing
              works, marking does not.
            </p>
          ) : null}
          {error ? <p className={styles.warn}>{error}</p> : null}
        </header>

        <div className={styles.toolbar}>
          <button
            type="button"
            className={`${styles.filterBtn} ${markedOnly ? styles.filterBtnOn : ""}`}
            onClick={() => {
              setMarkedOnly((v) => !v);
              setPage(0);
            }}
            aria-pressed={markedOnly}
          >
            Marked for regeneration
            <span className={styles.filterCount}>{markedCount}</span>
          </button>
          <span className={styles.toolbarNote}>
            Marks are stored in D1 <code>dataslope-illustrations</code> ·{" "}
            <code>illustration_regen_marks</code>
          </span>
        </div>

        {visible.length === 0 ? (
          <p className={styles.empty}>
            {markedOnly
              ? "Nothing is marked for regeneration."
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
                    onSave={(id, marked) => void onSave(id, marked)}
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
                {Math.min((current + 1) * PAGE_SIZE, visible.length)} of{" "}
                {visible.length}
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
      </>
    );
  };

  return (
    <div className={styles.page}>
      {/* Docked rather than inline in the header: the page is a long scroll of
          artwork, and flipping the background under it is the point, so the
          pill has to stay reachable wherever the reader has got to. */}
      <div className={styles.themeDock}>
        <ThemePillToggle />
      </div>
      <div className={styles.inner}>{body()}</div>
    </div>
  );
}
