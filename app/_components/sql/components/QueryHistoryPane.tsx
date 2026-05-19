"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, drawSelection } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { sql as sqlLang, SQLite, PostgreSQL } from "@codemirror/lang-sql";
import {
  CheckCircle,
  Clock,
  ExternalLink,
  History,
  Timer,
  Trash2,
  XCircle,
} from "lucide-react";
import { Popover } from "@base-ui-components/react/popover";
import { themeFor } from "../../cmExtensions";
import type { QueryHistoryEntry } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatTimeAgo(ts: number, now: number): string {
  const diffMs = now - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(3)}s`;
}

/**
 * Build the page-button sequence for the pagination bar.
 * Returns numbers (page indices, 1-based) and "…" ellipsis markers.
 */
function buildPageRange(current: number, total: number): (number | "…")[] {
  if (total <= 1) return total === 1 ? [1] : [];
  if (total <= 9) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "…")[] = [];

  // First 2 pages
  pages.push(1, 2);

  // Middle 5 centered on current, clamped to [3 … total-2]
  let lo = Math.max(3, current - 2);
  let hi = Math.min(total - 2, current + 2);

  // Expand to ensure up to 5 pages in the middle window
  while (hi - lo < 4) {
    if (lo > 3) lo--;
    else if (hi < total - 2) hi++;
    else break;
  }

  if (lo > 3) pages.push("…");
  for (let i = lo; i <= hi; i++) pages.push(i);
  if (hi < total - 2) pages.push("…");

  // Last 2 pages
  pages.push(total - 1, total);

  return pages;
}

// ─── Single history entry ─────────────────────────────────────────────────────

function HistoryEntryEditor({
  sql,
  theme,
  isPostgres,
}: {
  sql: string;
  theme: string;
  isPostgres: boolean;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;
    const themeComp = new Compartment();
    const view = new EditorView({
      doc: sql,
      parent: hostRef.current,
      extensions: [
        EditorState.readOnly.of(true),
        EditorView.editable.of(false),
        drawSelection(),
        EditorState.tabSize.of(2),
        indentUnit.of("  "),
        EditorView.lineWrapping,
        sqlLang({
          dialect: isPostgres ? PostgreSQL : SQLite,
          upperCaseKeywords: false,
        }),
        themeComp.of(themeFor(theme)),
      ],
    });
    viewRef.current = view;
    themeCompRef.current = themeComp;
    return () => {
      view.destroy();
      viewRef.current = null;
      themeCompRef.current = null;
    };
    // sql / theme updates handled by effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view && view.state.doc.toString() !== sql) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: sql },
      });
    }
  }, [sql]);

  useEffect(() => {
    if (viewRef.current && themeCompRef.current) {
      viewRef.current.dispatch({
        effects: themeCompRef.current.reconfigure(themeFor(theme)),
      });
    }
  }, [theme]);

  return <div className="sql-history-entry-editor" ref={hostRef} />;
}

interface HistoryEntryRowProps {
  entry: QueryHistoryEntry;
  theme: string;
  isPostgres: boolean;
  now: number;
  onOpenQueryTab?: (title: string, sql: string) => void;
}

function HistoryEntryRow({
  entry,
  theme,
  isPostgres,
  now,
  onOpenQueryTab,
}: HistoryEntryRowProps) {
  return (
    <div
      className={`sql-history-entry${entry.success ? " sql-history-entry--ok" : " sql-history-entry--err"}`}
    >
      <div className="sql-history-entry-header">
        <span className="sql-history-entry-donut" aria-hidden="true" />
        <span className="sql-history-entry-status">
          {entry.success ? (
            <CheckCircle size={13} aria-label="Success" />
          ) : (
            <XCircle size={13} aria-label="Error" />
          )}
        </span>
        <span className="sql-history-entry-source">{entry.source}</span>
        <span className="sql-history-entry-time">
          <Clock size={11} aria-hidden="true" />
          <Popover.Root>
            <Popover.Trigger
              openOnHover
              delay={200}
              closeDelay={80}
              render={(triggerProps) => (
                <span
                  {...triggerProps}
                  className="sql-history-entry-datetime"
                >
                  {formatTimeAgo(entry.executedAt, now)}
                </span>
              )}
            />
            <Popover.Portal>
              <Popover.Positioner
                className="sql-history-datetime-popover-positioner"
                side="top"
                sideOffset={6}
              >
                <Popover.Popup className="bui-popup sql-history-datetime-popover">
                  {formatDateTime(entry.executedAt)}
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
          <span className="sql-history-entry-dot" aria-hidden="true">
            ·
          </span>
          <Timer size={11} aria-hidden="true" />
          <span className="sql-history-entry-elapsed">
            {formatElapsed(entry.elapsedMs)}
          </span>
        </span>
        {onOpenQueryTab && (
          <button
            type="button"
            className="sql-history-open-btn"
            onClick={() => onOpenQueryTab(entry.source, entry.sql)}
            title="Open in query tab"
            aria-label="Open in query tab"
          >
            <ExternalLink size={11} aria-hidden="true" />
            Open in query tab
          </button>
        )}
      </div>
      {entry.error && (
        <div className="sql-history-entry-error">{entry.error}</div>
      )}
      <HistoryEntryEditor
        sql={entry.sql}
        theme={theme}
        isPostgres={isPostgres}
      />
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

export interface QueryHistoryPaneProps {
  history: QueryHistoryEntry[];
  theme: string;
  isPostgres?: boolean;
  onClear: () => void;
  onOpenQueryTab?: (title: string, sql: string) => void;
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export function QueryHistoryPane({
  history,
  theme,
  isPostgres = false,
  onClear,
  onOpenQueryTab,
}: QueryHistoryPaneProps) {
  // Refresh "X ago" labels roughly every 30 seconds.
  const [now, setNow] = React.useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(25);

  const totalPages = Math.max(1, Math.ceil(history.length / itemsPerPage));

  // Clamp current page when total pages shrinks (e.g. after clear or page-size change).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const handleClear = useCallback(() => {
    onClear();
    setCurrentPage(1);
  }, [onClear]);

  const handlePageSizeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setItemsPerPage(Number(e.target.value));
      setCurrentPage(1);
    },
    [],
  );

  const pageStart = (currentPage - 1) * itemsPerPage;
  const pageEntries = history.slice(pageStart, pageStart + itemsPerPage);
  const pageRange = buildPageRange(currentPage, totalPages);

  return (
    <div className="sql-query-history-pane">
      <div className="sql-history-toolbar">
        <span className="sql-history-title">
          <History size={14} aria-hidden="true" />
          Query History
          {history.length > 0 && (
            <span className="sql-history-count">
              {history.length} {history.length === 1 ? "query" : "queries"}
            </span>
          )}
        </span>
        {history.length > 0 && (
          <button
            type="button"
            className="sql-history-clear-btn"
            onClick={handleClear}
            title="Clear history"
            aria-label="Clear query history"
          >
            <Trash2 size={12} aria-hidden="true" />
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="sql-history-empty">
          <History size={32} aria-hidden="true" />
          <p>No queries yet.</p>
          <p className="sql-history-empty-sub">
            Queries you run will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="sql-history-list">
            {pageEntries.map((entry) => (
              <HistoryEntryRow
                key={entry.id}
                entry={entry}
                theme={theme}
                isPostgres={isPostgres}
                now={now}
                onOpenQueryTab={onOpenQueryTab}
              />
            ))}
          </div>

          {/* Pagination bar */}
          <div className="sql-history-pagination">
            <div className="sql-history-page-size-wrap">
              <label
                className="sql-history-page-size-label"
                htmlFor="sql-history-page-size"
              >
                Per page
              </label>
              <select
                id="sql-history-page-size"
                className="sql-history-page-size-select"
                value={itemsPerPage}
                onChange={handlePageSizeChange}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            {totalPages > 1 && (
              <div className="sql-history-page-btns" role="navigation" aria-label="Query history pages">
                <button
                  type="button"
                  className="sql-history-page-btn sql-history-page-btn--nav"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  aria-label={`Previous page (page ${currentPage} of ${totalPages})`}
                >
                  ‹
                </button>
                {pageRange.map((item, idx) =>
                  item === "…" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="sql-history-page-ellipsis"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      className={`sql-history-page-btn${item === currentPage ? " sql-history-page-btn--active" : ""}`}
                      onClick={() => setCurrentPage(item)}
                      aria-label={`Page ${item}`}
                      aria-current={item === currentPage ? "page" : undefined}
                    >
                      {item}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  className="sql-history-page-btn sql-history-page-btn--nav"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  aria-label={`Next page (page ${currentPage} of ${totalPages})`}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
