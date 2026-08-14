"use client";

// Sample-database selector shared by every SQL playground: the trigger shows
// the active filename; the popup lists dialect-specific action items
// (new / import / rename) followed by the sample databases.

import { Select } from "@base-ui/react/select";
import { Database } from "lucide-react";
import type { ReactNode } from "react";

export interface DatabaseSelectorAction {
  /** Sentinel id reported back to `onChange` when this item is picked. */
  id: string;
  /** Leading icon node (e.g. `<FilePlus size={14}/>`). */
  icon: ReactNode;
  /** Primary label (e.g. "New Database"). */
  label: string;
  /** Sub-label rendered under the primary label. */
  description: string;
}

export interface DatabaseSelectorSample {
  id: string;
  filename: string;
  description: string;
}

export interface DatabaseSelectorProps {
  /** Currently selected id, either a sample id or one of the
   *  blank-database / sentinel ids the host wires up. */
  value: string;
  /** Text rendered inside the trigger. Usually the active sample's
   *  filename, or a user-renamed filename for the blank database. */
  displayFilename: string;
  /** Sample databases shown beneath the action items. */
  samples: readonly DatabaseSelectorSample[];
  /** Action items shown at the top of the popup; each fires
   *  `onChange(action.id)` and the host handles the sentinel. */
  actions: readonly DatabaseSelectorAction[];
  /** Called with either an `action.id` sentinel or a `sample.id`. */
  onChange: (value: string) => void;
  /** Override for the chevron icon (defaults to a 10x10 inline SVG). */
  chevron?: ReactNode;
}

const DEFAULT_CHEVRON = (
  <svg viewBox="0 0 12 12" width={10} height={10}>
    <polyline
      points="2,4 6,8 10,4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

export function DatabaseSelector({
  value,
  displayFilename,
  samples,
  actions,
  onChange,
  chevron = DEFAULT_CHEVRON,
}: DatabaseSelectorProps) {
  return (
    <Select.Root
      value={value}
      onValueChange={(v) => onChange(String(v))}
    >
      <Select.Trigger
        className="sql-database-selector"
        aria-label="Select sample database"
      >
        <Database
          size={14}
          className="sql-db-selector-icon"
          aria-hidden="true"
        />
        <Select.Value className="sql-db-selector-value">
          {displayFilename}
        </Select.Value>
        <Select.Icon className="playground-switcher-icon">{chevron}</Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        {/* Scrolling lives in inner panes, not `body`, so Base UI's
            body-scroll-lock can't stop them; a transparent backdrop with
            `touch-action: none` swallows the touch gestures instead. */}
        <Select.Backdrop className="sql-db-backdrop" />
        <Select.Positioner
          className="sql-db-positioner"
          sideOffset={6}
          alignItemWithTrigger={false}
        >
          <Select.Popup className="bui-select-popup sql-db-popup">
            {actions.map((action) => (
              <Select.Item
                key={action.id}
                value={action.id}
                className="bui-select-item sql-db-item"
              >
                <span className="bui-select-item-icon" aria-hidden="true">
                  {action.icon}
                </span>
                <span className="sql-db-item-text">
                  <Select.ItemText>{action.label}</Select.ItemText>
                  <span className="sql-db-item-desc">{action.description}</span>
                </span>
              </Select.Item>
            ))}
            {actions.length > 0 && samples.length > 0 && (
              <>
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  className="sql-db-popup-sep"
                />
                <div className="sql-db-popup-group-label">Sample databases</div>
              </>
            )}
            {samples.map((sample) => (
              <Select.Item
                key={sample.id}
                value={sample.id}
                className="bui-select-item sql-db-item"
              >
                <span className="bui-select-item-icon" aria-hidden="true">
                  <Database size={14} />
                </span>
                <span className="sql-db-item-text">
                  <Select.ItemText>{sample.filename}</Select.ItemText>
                  <span className="sql-db-item-desc">{sample.description}</span>
                </span>
              </Select.Item>
            ))}
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
