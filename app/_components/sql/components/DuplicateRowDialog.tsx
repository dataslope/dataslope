"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { X } from "lucide-react";
import { formatCellDisplay } from "../utils/cellUtils";
import {
  buildDuplicateRowPlan,
  defaultDuplicateStrategy,
  isDuplicatePlanComplete,
  newUuid,
  suggestDuplicateText,
  type DuplicateColumnChoice,
  type DuplicateRowPlan,
  type DuplicateStrategy,
} from "../utils/duplicateRow";

/** The row a duplicate was asked for, plus the columns that stop it being
 *  copied verbatim. `null` closes the dialog. */
export interface DuplicateRowRequest {
  tableName: string;
  /** Columns the INSERT will carry (auto-populated ones already dropped). */
  columns: string[];
  /** Values copied from the source row, aligned with `columns`. */
  values: unknown[];
  /** The subset of `columns` under a primary-key / UNIQUE constraint the
   *  database won't re-generate. Never empty: with no conflicts the grid
   *  duplicates the row outright and never opens this dialog. */
  choices: DuplicateColumnChoice[];
}

export interface DuplicateRowDialogProps {
  request: DuplicateRowRequest | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (request: DuplicateRowRequest, plan: DuplicateRowPlan) => void;
}

/** Label for the "Auto" option, which differs by what can be generated. */
function autoLabel(choice: DuplicateColumnChoice): string {
  return choice.autoKind === "uuid" ? "New UUID" : "Next available number";
}

function autoHint(choice: DuplicateColumnChoice): string {
  return choice.autoKind === "uuid"
    ? "Generated in the browser"
    : `MAX(${choice.name}) + 1, read when the row is inserted`;
}

/**
 * "Duplicate row" for a table whose primary key or UNIQUE columns can't be
 * copied as they are. Each conflicting column gets its own answer: generate
 * one (a fresh UUID, the next number), type one, clear it to NULL where the
 * column allows it, or — for a composite key, where moving one member is
 * enough — keep the original.
 */
export function DuplicateRowDialog({
  request,
  onOpenChange,
  onConfirm,
}: DuplicateRowDialogProps) {
  const [seed, setSeed] = useState<DuplicateRowRequest | null>(null);
  const [strategies, setStrategies] = useState<
    Record<string, DuplicateStrategy>
  >({});
  const [customText, setCustomText] = useState<Record<string, string>>({});

  // Seed the form during the render that opens the dialog (the "adjust state
  // when a prop changes" pattern — in render, not an effect), so reopening on
  // another row never shows the previous row's answers.
  if (request !== seed) {
    setSeed(request);
    const nextStrategies: Record<string, DuplicateStrategy> = {};
    const nextText: Record<string, string> = {};
    for (const choice of request?.choices ?? []) {
      nextStrategies[choice.name] = defaultDuplicateStrategy(choice);
      // No UUID is minted here: `newUuid()` is random, and render stays pure.
      // A UUID column that starts on "Auto" gets one when it is inserted;
      // switching it to "Custom value" fills the field in below.
      nextText[choice.name] = suggestDuplicateText(choice, "");
    }
    setStrategies(nextStrategies);
    setCustomText(nextText);
  }

  const choices = request?.choices ?? [];
  const complete = isDuplicatePlanComplete(choices, strategies, customText);

  function selectStrategy(
    choice: DuplicateColumnChoice,
    strategy: DuplicateStrategy,
  ) {
    setStrategies((prev) => ({ ...prev, [choice.name]: strategy }));
    // Switching a UUID column to a typed value hands the user a fresh one to
    // start from rather than an empty box they have to invent a UUID for.
    if (strategy === "custom" && choice.autoKind === "uuid") {
      setCustomText((prev) =>
        prev[choice.name] ? prev : { ...prev, [choice.name]: newUuid() },
      );
    }
  }

  function handleConfirm() {
    if (!request || !complete) return;
    onConfirm(
      request,
      buildDuplicateRowPlan(choices, strategies, customText, newUuid),
    );
    onOpenChange(false);
  }

  return (
    <Dialog.Root
      open={request !== null}
      onOpenChange={(next) => {
        if (!next) onOpenChange(false);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="confirm-backdrop" />
        <Dialog.Popup className="confirm-popup sql-duplicate-popup">
          <div className="sql-create-header">
            <Dialog.Title className="confirm-title">Duplicate row</Dialog.Title>
            <Dialog.Close
              className="sql-modify-drawer-close"
              aria-label="Close"
            >
              <X size={16} aria-hidden="true" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="confirm-desc sql-duplicate-desc">
            {choices.length === 1
              ? "One column in "
              : `${choices.length} columns in `}
            <strong>{request?.tableName}</strong>
            {choices.length === 1
              ? " has to stay unique, so the copy needs its own value."
              : " have to stay unique, so the copy needs its own values."}
          </Dialog.Description>
          <div className="sql-create-body sql-duplicate-body">
            {choices.map((choice) => {
              const strategy =
                strategies[choice.name] ?? defaultDuplicateStrategy(choice);
              const radioName = `sql-duplicate-${choice.name}`;
              return (
                <div key={choice.name} className="sql-duplicate-col">
                  <div className="sql-duplicate-col-head">
                    <span className="sql-duplicate-col-name">
                      {choice.name}
                    </span>
                    {choice.isPrimaryKey && (
                      <span className="sql-duplicate-badge">PRIMARY KEY</span>
                    )}
                    {choice.isUnique && (
                      <span className="sql-duplicate-badge">UNIQUE</span>
                    )}
                    {choice.type && (
                      <span className="sql-duplicate-type">{choice.type}</span>
                    )}
                  </div>
                  <div className="sql-duplicate-current">
                    Current value:{" "}
                    <code>{formatCellDisplay(choice.originalValue)}</code>
                  </div>
                  <div
                    className="sql-duplicate-options"
                    role="radiogroup"
                    aria-label={`New value for ${choice.name}`}
                  >
                    {choice.autoKind !== null && (
                      <label className="sql-duplicate-option">
                        <input
                          type="radio"
                          name={radioName}
                          checked={strategy === "auto"}
                          onChange={() => selectStrategy(choice, "auto")}
                        />
                        <span className="sql-duplicate-option-text">
                          <span>{autoLabel(choice)}</span>
                          <span className="sql-duplicate-option-hint">
                            {autoHint(choice)}
                          </span>
                        </span>
                      </label>
                    )}
                    <label className="sql-duplicate-option">
                      <input
                        type="radio"
                        name={radioName}
                        checked={strategy === "custom"}
                        onChange={() => selectStrategy(choice, "custom")}
                      />
                      <span className="sql-duplicate-option-text">
                        <span>Custom value</span>
                      </span>
                    </label>
                    {choice.canBeNull && (
                      <label className="sql-duplicate-option">
                        <input
                          type="radio"
                          name={radioName}
                          checked={strategy === "null"}
                          onChange={() => selectStrategy(choice, "null")}
                        />
                        <span className="sql-duplicate-option-text">
                          <span>Set to NULL</span>
                          <span className="sql-duplicate-option-hint">
                            NULLs never collide in a unique index
                          </span>
                        </span>
                      </label>
                    )}
                    <label className="sql-duplicate-option">
                      <input
                        type="radio"
                        name={radioName}
                        checked={strategy === "keep"}
                        onChange={() => selectStrategy(choice, "keep")}
                      />
                      <span className="sql-duplicate-option-text">
                        <span>Keep original</span>
                        <span className="sql-duplicate-option-hint">
                          Only works if another column changes
                        </span>
                      </span>
                    </label>
                  </div>
                  {strategy === "custom" && (
                    <input
                      className="sql-create-input sql-duplicate-input"
                      value={customText[choice.name] ?? ""}
                      onChange={(e) =>
                        setCustomText((prev) => ({
                          ...prev,
                          [choice.name]: e.target.value,
                        }))
                      }
                      spellCheck={false}
                      placeholder={`New ${choice.name}`}
                      aria-label={`Custom value for ${choice.name}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          {!complete && (
            <p className="confirm-desc sql-duplicate-warning">
              {choices.every(
                (c) =>
                  (strategies[c.name] ?? defaultDuplicateStrategy(c)) === "keep",
              )
                ? "At least one column has to change, or the copy collides with the row it came from."
                : "Fill in every custom value, or pick another option for it."}
            </p>
          )}
          <div className="confirm-actions">
            <Dialog.Close className="confirm-btn confirm-btn-secondary">
              Cancel
            </Dialog.Close>
            <button
              type="button"
              className="confirm-btn confirm-btn-primary"
              onClick={handleConfirm}
              disabled={!complete}
            >
              Duplicate row
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
