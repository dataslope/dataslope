"use client";

/**
 * The ER-diagram and DDL viewers behind the SQL cards' tools menu. Own
 * module because it carries @xyflow/react + elkjs + a second CodeMirror —
 * SqlCardToolsMenu imports it lazily so lessons only pay on first open.
 * `erDiagram.css` is imported here, not sqlPlayground.css, whose `:root`
 * block would repaint the lesson in the playground's dark palette.
 */

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Network, X, FileCode2 } from "lucide-react";
import { DiamondSpinner } from "../mdx/loadingAnimations";
import { DdlViewer } from "../sql/components/DdlViewer";
import { ErDiagramPane } from "../ErDiagramPane";
import type { SqlSchemaSnapshot } from "./schemaSnapshot";
import cardStyles from "../ChallengeCard.module.css";
import styles from "./SqlCardDialogs.module.css";
import "../erDiagram.css";

export type SqlCardDialogKind = "er" | "ddl";

export interface SqlCardDialogsProps {
  kind: SqlCardDialogKind;
  onClose: () => void;
  /** Null while the snapshot is still being read from the engine. */
  snapshot: SqlSchemaSnapshot | null;
  /** DDL script for the whole database. Null while loading. */
  ddl: string | null;
  /** Set when introspection failed outright. */
  error: string | null;
  isDark: boolean;
  cmTheme: string;
  isPostgres: boolean;
  copied: boolean;
  onCopyDdl: () => void;
}

/** Backdrop + card shell shared by both dialogs, portaled to `<body>` so
 *  a transformed ancestor can't trap the fixed backdrop (the same reason
 *  the reference-solution modal portals). */
function DialogShell({
  label,
  title,
  subtitle,
  icon,
  actions,
  onClose,
  children,
}: {
  label: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  actions?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className={cardStyles.modalBackdrop}
    >
      <div
        className={`${cardStyles.card} ${cardStyles.modalCard} ${styles.toolModalCard}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cardStyles.modalHeader}>
          <div className={cardStyles.badge}>{icon}</div>
          <div className={cardStyles.modalTitleArea}>
            <div className={cardStyles.modalTitle}>{title}</div>
            <div className={cardStyles.modalSubtitle}>{subtitle}</div>
          </div>
          <div className={cardStyles.modalActions}>
            {actions}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              title="Close"
              className={cardStyles.modalIconBtn}
            >
              <X size={14} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  return typeof document === "undefined"
    ? modal
    : createPortal(modal, document.body);
}

export default function SqlCardDialogs({
  kind,
  onClose,
  snapshot,
  ddl,
  error,
  isDark,
  cmTheme,
  isPostgres,
  copied,
  onCopyDdl,
}: SqlCardDialogsProps) {
  if (kind === "er") {
    const tables = snapshot?.tables ?? [];
    return (
      <DialogShell
        label="Entity relationship diagram"
        title="ER Diagram"
        subtitle={
          snapshot === null
            ? "Reading the schema…"
            : `${tables.length} table${tables.length === 1 ? "" : "s"} in this database`
        }
        icon={<Network size={9} aria-hidden />}
        onClose={onClose}
      >
        {error ? (
          <div className={styles.dialogStatus}>{error}</div>
        ) : snapshot === null ? (
          <div className={styles.dialogStatus}>
            <DiamondSpinner size={22} label="Reading the schema…" />
          </div>
        ) : tables.length === 0 ? (
          <div className={styles.dialogStatus}>
            This database has no tables yet. Run the block&apos;s setup, then
            reopen the diagram.
          </div>
        ) : (
          <div className={styles.erHost}>
            {/* Read-only: context-menu callbacks omitted, so no editing
                actions render. */}
            <ErDiagramPane
              tables={tables}
              columnsByEntity={snapshot.columnsByEntity}
              foreignKeysByEntity={snapshot.foreignKeysByEntity}
              isDark={isDark}
            />
          </div>
        )}
      </DialogShell>
    );
  }

  const entityCount =
    (snapshot?.tables.length ?? 0) + (snapshot?.views.length ?? 0);
  return (
    <DialogShell
      label="Data definition language"
      title="View DDL"
      subtitle={
        ddl === null
          ? "Reading the schema…"
          : `The CREATE statements behind ${entityCount} object${entityCount === 1 ? "" : "s"}`
      }
      icon={<FileCode2 size={9} aria-hidden />}
      onClose={onClose}
      actions={
        ddl ? (
          <button
            type="button"
            onClick={onCopyDdl}
            aria-label="Copy DDL"
            title="Copy DDL"
            className={cardStyles.modalIconBtn}
          >
            {copied ? (
              <Check size={14} strokeWidth={2.4} aria-hidden />
            ) : (
              <Copy size={14} strokeWidth={2} aria-hidden />
            )}
          </button>
        ) : null
      }
    >
      {error ? (
        <div className={styles.dialogStatus}>{error}</div>
      ) : ddl === null ? (
        <div className={styles.dialogStatus}>
          <DiamondSpinner size={22} label="Reading the schema…" />
        </div>
      ) : ddl.trim() === "" ? (
        <div className={styles.dialogStatus}>
          This database has no tables or views yet.
        </div>
      ) : (
        <>
          <div className={styles.ddlBody}>
            <DdlViewer sql={ddl} theme={cmTheme} isPostgres={isPostgres} />
          </div>
          <div className={styles.dialogFootnote}>
            Read-only. These are the statements that built the tables you can
            query above.
          </div>
        </>
      )}
    </DialogShell>
  );
}
