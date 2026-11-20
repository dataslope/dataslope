"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ChevronDown } from "lucide-react";
import {
  computeVisibleTypeGroups,
  type ColumnTypeGroup,
} from "../utils/columnTypeSelector";

/** The column-type field of the structure editors: a list of the dialect's
 *  built-in types that also accepts anything typed (`numeric(10,2)`,
 *  `VARCHAR(15)`).
 *
 *  One component for all three playgrounds. There used to be three copies,
 *  and they had drifted: the Postgres one had been fixed to keep showing a
 *  typed custom type after blur, while the SQLite and DuckDB ones still
 *  blanked the field (the value was applied, but the reader could no longer
 *  see what would be created).
 *
 *  `classPrefix` keeps each dialect's existing class names, which the
 *  stylesheet and the e2e specs select on. */
export function ColumnTypeCombobox({
  value,
  onChange,
  groups,
  isValidCustomType,
  placeholder,
  classPrefix,
}: {
  value: string;
  onChange: (value: string) => void;
  groups: readonly ColumnTypeGroup[];
  /** Whether typed text that is not a built-in type is acceptable as one.
   *  Rejected text reverts to the committed type on blur. */
  isValidCustomType: (type: string) => boolean;
  placeholder: string;
  classPrefix: string;
}) {
  const options = useMemo(() => groups.flatMap((g) => g.types), [groups]);
  const [inputVal, setInputVal] = useState(value);
  // Whether the user is editing right now. Base UI's Combobox clears its
  // input when it closes with no list item selected, which is always the
  // case for a custom type, since that matches no entry.
  const focusedRef = useRef(false);
  // The committed type, readable synchronously: the `value` prop in a
  // closure is one render stale during the blur that commits a new one.
  const committedRef = useRef(value);

  // Sync when the committed value changes externally, but never mid-edit.
  useEffect(() => {
    committedRef.current = value;
    if (!focusedRef.current) setInputVal(value);
  }, [value]);

  const visibleGroups = useMemo(
    () => computeVisibleTypeGroups(groups, options, inputVal, value),
    [groups, options, inputVal, value],
  );

  // Built-in types are matched whatever the case: `INTEGER` is `integer`.
  // Matching exactly left nothing selected for the uppercase spelling, so
  // the list highlighted its first row and Enter committed `smallint`.
  const matchOption = (typed: string) =>
    options.find((o) => o.toLowerCase() === typed.trim().toLowerCase());

  const commit = (next: string) => {
    committedRef.current = next;
    setInputVal(next);
    if (next !== value) onChange(next);
  };

  return (
    <Combobox.Root
      value={matchOption(inputVal) ?? null}
      onValueChange={(newValue) => {
        if (newValue) commit(newValue as string);
      }}
      inputValue={inputVal}
      onInputValueChange={(v) => {
        // Outside of active editing the committed type wins over the
        // Combobox's close-time reset to "".
        if (!focusedRef.current && v === "" && committedRef.current !== "") {
          setInputVal(committedRef.current);
          return;
        }
        setInputVal(v);
      }}
      filter={null}
      openOnInputClick
      autoHighlight
    >
      <div className={`${classPrefix}-input-group`}>
        <Combobox.Input
          className={`sql-rename-input sql-modify-col-type ${classPrefix}-input`}
          placeholder={placeholder}
          aria-label="Column type"
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            const typed = inputVal.trim();
            const builtIn = matchOption(typed);
            // A built-in keeps the spelling the list uses; other text is
            // kept only if the dialect could accept it as a type.
            const finalVal =
              builtIn ??
              (typed && isValidCustomType(typed) ? typed : committedRef.current);
            commit(finalVal);
          }}
        />
        <Combobox.Trigger
          className={`${classPrefix}-trigger`}
          aria-label="Open type list"
        >
          <ChevronDown size={14} />
        </Combobox.Trigger>
      </div>
      <Combobox.Portal>
        <Combobox.Positioner
          sideOffset={4}
          align="start"
          className={`${classPrefix}-positioner`}
        >
          <Combobox.Popup className={`bui-select-popup ${classPrefix}-popup`}>
            <Combobox.List>
              {visibleGroups.map((group) => (
                <Combobox.Group
                  key={group.label}
                  className={`${classPrefix}-group`}
                >
                  {group.label && (
                    <Combobox.GroupLabel
                      className={`${classPrefix}-group-label`}
                    >
                      {group.label}
                    </Combobox.GroupLabel>
                  )}
                  {group.types.map((type) => (
                    <Combobox.Item
                      key={type}
                      value={type}
                      className="bui-select-item"
                    >
                      {type}
                    </Combobox.Item>
                  ))}
                </Combobox.Group>
              ))}
              {visibleGroups.length === 0 && (
                <div className={`${classPrefix}-empty`}>
                  No matching built-in types. You can keep the typed value.
                </div>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
