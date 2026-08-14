"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown } from "lucide-react";
import {
  computeVisibleTypeGroups,
  type ColumnTypeGroup,
} from "../utils/columnTypeSelector";

/** Sentinel value for the optional "clear" item. Kept off the normal value
 *  space (a NUL prefix) so it can never collide with a real table/column
 *  name or type string. Selecting it commits the empty string. */
const NONE_SENTINEL = "\0__structure_combobox_none__";

/**
 * Typable combobox for the Structure drawer's column-type field (SQLite) and
 * FK table/column fields (all dialects). Mirrors PgTypeSelector /
 * DuckDbTypeSelector behaviour but renders under its own `.sql-combobox-*`
 * classes — their `.playground-type-*` / `.duckdb-type-*` hooks are relied
 * on by tests and styling. `freeform` allows arbitrary typed values (types);
 * constrained fields (FKs) revert to the last committed value.
 */
export function StructureCombobox({
  value,
  onChange,
  groups,
  placeholder,
  ariaLabel,
  triggerAriaLabel = "Open list",
  disabled = false,
  freeform = false,
  noneLabel,
  emptyText = "No matching options.",
}: {
  value: string;
  onChange: (value: string) => void;
  groups: readonly ColumnTypeGroup[];
  placeholder: string;
  ariaLabel: string;
  triggerAriaLabel?: string;
  disabled?: boolean;
  freeform?: boolean;
  /** When provided, a leading item that clears the value (e.g. FK "— none"). */
  noneLabel?: string;
  emptyText?: string;
}) {
  const allOptions = useMemo(() => groups.flatMap((g) => g.types), [groups]);
  const [inputVal, setInputVal] = useState(value);
  // Prevents the Combobox's internal blur-reset from overriding our state.
  const blurLockRef = useRef<string | null>(null);

  // Sync inputVal when the committed value changes externally (e.g. a
  // different column row is selected) but not while we own the blur lock.
  useEffect(() => {
    if (blurLockRef.current === null) setInputVal(value);
  }, [value]);

  const visibleGroups = useMemo(
    () => computeVisibleTypeGroups(groups, allOptions, inputVal, value),
    [groups, allOptions, inputVal, value],
  );

  // Disabled fields render as an inert input so the combobox never opens
  // (used for the FK column field before a FK table has been chosen).
  if (disabled) {
    return (
      <div className="sql-combobox-group is-disabled">
        <input
          className="sql-rename-input sql-modify-col-type sql-combobox-input"
          value={value}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled
          readOnly
        />
        <span className="sql-combobox-trigger" aria-hidden="true">
          <ChevronDown size={14} />
        </span>
      </div>
    );
  }

  const commit = (next: string) => {
    blurLockRef.current = next;
    setInputVal(next);
    if (next !== value) onChange(next);
    setTimeout(() => {
      blurLockRef.current = null;
    }, 0);
  };

  return (
    <Combobox.Root
      value={allOptions.includes(inputVal) ? inputVal : null}
      onValueChange={(newValue) => {
        if (newValue === null || newValue === undefined) return;
        commit(newValue === NONE_SENTINEL ? "" : (newValue as string));
      }}
      inputValue={inputVal}
      onInputValueChange={(v) => {
        // Ignore any reset the Combobox tries to apply while the blur lock
        // is held (it resets to "" when no item is selected on close).
        if (blurLockRef.current !== null) {
          setInputVal(blurLockRef.current);
          return;
        }
        setInputVal(v);
      }}
      filter={null}
      openOnInputClick
      autoHighlight
    >
      <div className="sql-combobox-group">
        <Combobox.Input
          className="sql-rename-input sql-modify-col-type sql-combobox-input"
          placeholder={placeholder}
          aria-label={ariaLabel}
          onBlur={() => {
            const typed = inputVal.trim();
            let finalVal: string;
            if (freeform) {
              finalVal = typed || value;
            } else if (typed === "") {
              // Constrained + empty: clear only when clearing is allowed.
              finalVal = noneLabel !== undefined ? "" : value;
            } else {
              // Constrained: accept only an exact (case-insensitive) option,
              // otherwise revert to the last committed value.
              finalVal =
                allOptions.find((o) => o.toLowerCase() === typed.toLowerCase()) ??
                value;
            }
            if (finalVal !== value) onChange(finalVal);
            blurLockRef.current = finalVal;
            setInputVal(finalVal);
            setTimeout(() => {
              blurLockRef.current = null;
            }, 100);
          }}
        />
        <Combobox.Trigger
          className="sql-combobox-trigger"
          aria-label={triggerAriaLabel}
        >
          <ChevronDown size={14} />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className="sql-combobox-positioner"
        >
          <Combobox.Popup className="bui-select-popup sql-combobox-popup">
            <Combobox.List>
              {noneLabel !== undefined && (
                <Combobox.Item
                  value={NONE_SENTINEL}
                  className="bui-select-item sql-combobox-none"
                >
                  {noneLabel}
                </Combobox.Item>
              )}
              {visibleGroups.map((group) => (
                <Combobox.Group
                  key={group.label || "__ungrouped__"}
                  className="sql-combobox-list-group"
                >
                  {group.label && (
                    <Combobox.GroupLabel className="sql-combobox-group-label">
                      {group.label}
                    </Combobox.GroupLabel>
                  )}
                  {group.types.map((opt) => (
                    <Combobox.Item
                      key={opt}
                      value={opt}
                      className="bui-select-item"
                    >
                      {opt}
                    </Combobox.Item>
                  ))}
                </Combobox.Group>
              ))}
              {visibleGroups.length === 0 && noneLabel === undefined && (
                <div className="sql-combobox-empty">{emptyText}</div>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

/** Thin wrapper over {@link StructureCombobox} for the foreign-key table and
 *  column fields: a flat option list, constrained input, and a leading item
 *  that clears the reference. The clear item reuses the field's `placeholder`
 *  so it reads the same as the empty/default label (e.g. `(none)`, `(column)`). */
export function FkCombobox({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder: string;
  ariaLabel: string;
  disabled?: boolean;
}) {
  const groups = useMemo<ColumnTypeGroup[]>(
    () => [{ label: "", types: options }],
    [options],
  );
  return (
    <StructureCombobox
      value={value}
      onChange={onChange}
      groups={groups}
      placeholder={placeholder}
      ariaLabel={ariaLabel}
      triggerAriaLabel={`Open list: ${ariaLabel}`}
      disabled={disabled}
      freeform={false}
      noneLabel={placeholder}
    />
  );
}
