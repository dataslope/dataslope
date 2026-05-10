"use client";

import React, { useEffect, useRef, useCallback } from "react";
import { EditorState, Compartment } from "@codemirror/state";
import { EditorView, drawSelection } from "@codemirror/view";
import { indentUnit } from "@codemirror/language";
import { sql as sqlLang, SQLite, PostgreSQL } from "@codemirror/lang-sql";
import { CheckCircle, Clock, History, Trash2, XCircle } from "lucide-react";
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
}

function HistoryEntryRow({
  entry,
  theme,
  isPostgres,
  now,
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
          <span
            className="sql-history-entry-datetime"
            title={formatDateTime(entry.executedAt)}
          >
            {formatTimeAgo(entry.executedAt, now)}
          </span>
          <span className="sql-history-entry-elapsed">
            {formatElapsed(entry.elapsedMs)}
          </span>
        </span>
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
}

export function QueryHistoryPane({
  history,
  theme,
  isPostgres = false,
  onClear,
}: QueryHistoryPaneProps) {
  // Refresh "X ago" labels roughly every 30 seconds.
  const [now, setNow] = React.useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const handleClear = useCallback(() => {
    onClear();
  }, [onClear]);

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
        <div className="sql-history-list">
          {history.map((entry) => (
            <HistoryEntryRow
              key={entry.id}
              entry={entry}
              theme={theme}
              isPostgres={isPostgres}
              now={now}
            />
          ))}
        </div>
      )}
    </div>
  );
}
