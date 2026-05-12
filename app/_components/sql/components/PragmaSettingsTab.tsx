"use client";

import { useState } from "react";
import { Popover } from "@base-ui-components/react/popover";
import { Tabs } from "@base-ui-components/react/tabs";
import { CircleHelp, RotateCcw } from "lucide-react";
import {
  DEFAULT_PRAGMA_SETTINGS,
  type PragmaSettings,
} from "../stores/usePragmaStore";

// ─── Pragma descriptions shown in each row's info popover ────────────────────

const PRAGMA_DESCRIPTIONS: Record<keyof PragmaSettings, string> = {
  foreignKeys:
    "Enforces referential integrity for foreign key constraints. When ON, SQLite raises an error on inserts or updates that would violate a declared FOREIGN KEY relationship.",
  journalMode:
    "Controls how the rollback journal file is managed after a commit. DELETE (default) removes the journal each time. WAL (Write-Ahead Log) allows concurrent reads while a write is in progress.",
  synchronous:
    "Controls how aggressively SQLite syncs data to disk. FULL (default) is safest; NORMAL reduces sync calls; OFF skips syncing entirely and is fastest but risks corruption on an OS crash.",
  pageSize:
    "Size in bytes of each page in the database file. Must be a power of 2 between 512 and 65536. Can only be changed before the first table is created in a new database.",
  automaticIndex:
    "When ON (default), SQLite may automatically create temporary indexes during query planning to speed up full-table scans. Disabling reduces memory overhead at the cost of potentially slower queries.",
  caseSensitiveLike:
    "When ON, the LIKE operator distinguishes uppercase and lowercase ASCII letters. By default (OFF), LIKE is case-insensitive for ASCII characters.",
};

// ─── Column header popovers in the modify-table drawer ───────────────────────

const COLUMN_HEADER_DESCRIPTIONS: Record<string, string> = {
  type: "The SQLite data type for this column, such as INTEGER, TEXT, REAL, or BLOB.",
  notNull:
    "When checked, every row must have a value in this column. NULL values are not allowed.",
  primary:
    "When checked, this column is the primary key used to uniquely identify each row.",
  unique: "When checked, no two rows can have the same value in this column.",
  autoIncrement:
    "When checked, SQLite automatically assigns an incrementing integer value for each new row.",
  defaultValue:
    "The value automatically used for this column when no value is provided during insertion.",
  fkTable: "The table that this column references as a foreign key.",
  fkColumn:
    "The column in the referenced table that this foreign key column maps to.",
  onDelete:
    "The action to perform when the referenced row in the foreign table is deleted.",
  onUpdate:
    "The action to perform when the referenced value in the foreign table is updated.",
};

export function PragmaInfoButton({ pragma }: { pragma: keyof PragmaSettings }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="pragma-info-btn"
        aria-label="More info"
        openOnHover
        delay={80}
        closeDelay={120}
      >
        <CircleHelp size={13} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="pragma-info-positioner"
          sideOffset={6}
          align="start"
        >
          <Popover.Popup className="bui-popup pragma-info-popup">
            <p className="pragma-info-text">{PRAGMA_DESCRIPTIONS[pragma]}</p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function ColumnHeaderPopover({ pragma }: { pragma: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger
        className="sql-col-header-info"
        aria-label="More info"
        openOnHover
        delay={80}
        closeDelay={120}
      >
        <CircleHelp size={11} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="sql-col-header-positioner"
          sideOffset={6}
          align="center"
        >
          <Popover.Popup className="bui-popup sql-col-header-popup">
            <p className="sql-col-header-text">
              {COLUMN_HEADER_DESCRIPTIONS[pragma]}
            </p>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function PragmaSettingsTab({
  savedPragmas,
  onSave,
}: {
  savedPragmas: PragmaSettings;
  onSave: (p: PragmaSettings) => void;
}) {
  const [draft, setDraft] = useState<PragmaSettings>({ ...savedPragmas });

  const hasChanges =
    draft.foreignKeys !== savedPragmas.foreignKeys ||
    draft.journalMode !== savedPragmas.journalMode ||
    draft.synchronous !== savedPragmas.synchronous ||
    draft.pageSize !== savedPragmas.pageSize ||
    draft.automaticIndex !== savedPragmas.automaticIndex ||
    draft.caseSensitiveLike !== savedPragmas.caseSensitiveLike;

  return (
    <Tabs.Panel value="pragmas" className="settings-panel-pane">
      <div className="settings-body pragma-settings-body">
        {/* Foreign keys */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Foreign Keys</span>
            <PragmaInfoButton pragma="foreignKeys" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.foreignKeys}
              onChange={(e) =>
                setDraft((d) => ({ ...d, foreignKeys: e.target.checked }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.foreignKeys ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Journal mode */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Journal Mode</span>
            <PragmaInfoButton pragma="journalMode" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.journalMode}
              onChange={(e) =>
                setDraft((d) => ({ ...d, journalMode: e.target.value }))
              }
            >
              <option value="delete">Delete</option>
              <option value="truncate">Truncate</option>
              <option value="persist">Persist</option>
              <option value="memory">Memory</option>
              <option value="wal">WAL</option>
              <option value="off">Off</option>
            </select>
          </div>
        </div>

        {/* Synchronous */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Synchronous</span>
            <PragmaInfoButton pragma="synchronous" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.synchronous}
              onChange={(e) =>
                setDraft((d) => ({ ...d, synchronous: e.target.value }))
              }
            >
              <option value="off">Off</option>
              <option value="normal">Normal</option>
              <option value="full">Full</option>
            </select>
          </div>
        </div>

        {/* Page size */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Page Size (bytes)</span>
            <PragmaInfoButton pragma="pageSize" />
          </div>
          <div className="pragma-select-wrap">
            <select
              className="pragma-select"
              value={draft.pageSize}
              onChange={(e) =>
                setDraft((d) => ({ ...d, pageSize: Number(e.target.value) }))
              }
            >
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
              <option value={8192}>8192</option>
              <option value={16384}>16384</option>
              <option value={32768}>32768</option>
              <option value={65536}>65536</option>
            </select>
          </div>
        </div>

        {/* Automatic index */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Automatic Index</span>
            <PragmaInfoButton pragma="automaticIndex" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.automaticIndex}
              onChange={(e) =>
                setDraft((d) => ({ ...d, automaticIndex: e.target.checked }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.automaticIndex ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Case sensitive LIKE */}
        <div className="pragma-row">
          <div className="pragma-label-wrap">
            <span className="pragma-label">Case Sensitive LIKE</span>
            <PragmaInfoButton pragma="caseSensitiveLike" />
          </div>
          <label className="setting-checkbox-row pragma-checkbox-row">
            <input
              type="checkbox"
              checked={draft.caseSensitiveLike}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  caseSensitiveLike: e.target.checked,
                }))
              }
            />
            <span className="pragma-checkbox-label">
              {draft.caseSensitiveLike ? "Enabled" : "Disabled"}
            </span>
          </label>
        </div>

        {/* Bottom actions */}
        <div className="pragma-actions">
          <button
            type="button"
            className="pragma-reset-btn"
            onClick={() => setDraft({ ...DEFAULT_PRAGMA_SETTINGS })}
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset to defaults</span>
          </button>
          <button
            type="button"
            className="pragma-save-btn"
            disabled={!hasChanges}
            onClick={() => onSave(draft)}
          >
            Save
          </button>
        </div>
      </div>
    </Tabs.Panel>
  );
}
