"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";
import React from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Hash,
  Plus,
  Table,
  Trash2,
  Zap,
} from "lucide-react";
import type { ModifyColumnDraft } from "../types";
import type { TableColumnInfo, SqliteEngine } from "../../runtime/sqlite";
import { COLUMN_TYPES, FK_ACTIONS } from "../constants";
import type { ColumnTypeGroup } from "../utils/columnTypeSelector";
import { DdlViewer } from "./DdlViewer";
import { GenExprEditor } from "./GenExprEditor";
import { ColumnHeaderPopover } from "./PragmaSettingsTab";
import { StructureCombobox, FkCombobox } from "./StructureCombobox";

/** SQLite type affinities, surfaced as a single flat group in the type
 *  combobox. Freeform entry keeps any custom declared type (e.g.
 *  `VARCHAR(15)`) that an imported schema may carry. */
const SQLITE_TYPE_GROUPS: ColumnTypeGroup[] = [
  { label: "", types: COLUMN_TYPES },
];

function newDraftId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export interface ModifyStructureState {
  originalName: string;
  newName: string;
  columns: ModifyColumnDraft[];
}

export function ColumnFlag({
  checked,
  onChange,
  label,
  disabled,
  showLabel = true,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
  showLabel?: boolean;
}) {
  return (
    <label className={`sql-modify-flag${disabled ? " is-disabled" : ""}`}>
      <Checkbox.Root
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        disabled={disabled}
        className="sql-modify-flag-box"
        aria-label={label}
        title={label}
      >
        <Checkbox.Indicator className="sql-modify-flag-ind">
          ✓
        </Checkbox.Indicator>
      </Checkbox.Root>
      {showLabel && <span>{label}</span>}
    </label>
  );
}

export function ModifyColumnRow({
  col,
  onChange,
  onRemove,
  hasNameError,
  onBlurName,
  knownTables,
  engine,
}: {
  col: ModifyColumnDraft;
  onChange: (patch: Partial<ModifyColumnDraft>) => void;
  onRemove: () => void;
  hasNameError?: boolean;
  onBlurName?: () => void;
  knownTables: string[];
  engine: SqliteEngine | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: col.id });

  const style: React.CSSProperties = {
    transform: DndCSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    position: isDragging ? "relative" : undefined,
    zIndex: isDragging ? 1 : undefined,
  };

  const [fkTargetColumns, setFkTargetColumns] = useState<TableColumnInfo[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!engine || !col.fkTable) {
      queueMicrotask(() => {
        if (!cancelled) setFkTargetColumns([]);
      });
      return;
    }
    void engine
      .listColumns(col.fkTable)
      .then((cols) => {
        if (!cancelled) setFkTargetColumns(cols);
      })
      .catch(() => {
        if (!cancelled) setFkTargetColumns([]);
      });
    return () => {
      cancelled = true;
    };
  }, [engine, col.fkTable]);
  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="sql-modify-col-row"
      {...attributes}
    >
      <td className="sql-modify-drag-cell">
        <span
          className="sql-modify-drag-handle"
          title="Drag to reorder"
          {...listeners}
        >
          <GripVertical size={14} aria-hidden="true" />
        </span>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <input
            className={`sql-rename-input sql-modify-col-name${hasNameError ? " sql-modify-col-name-error" : ""}`}
            value={col.name}
            onChange={(e) => onChange({ name: e.target.value })}
            onBlur={onBlurName}
            placeholder="column name"
            aria-label="Column name"
            data-col-id={col.id}
          />
        </label>
      </td>
      <td>
        {/* SQLite columns can declare any type (e.g. `VARCHAR(15)` from an
            imported schema); the freeform combobox preserves whatever is
            typed while still offering the built-in affinities. */}
        <StructureCombobox
          value={col.type}
          onChange={(type) => onChange({ type })}
          groups={SQLITE_TYPE_GROUPS}
          placeholder="e.g. TEXT"
          ariaLabel="Column type"
          triggerAriaLabel="Open type list"
          freeform
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.notNull}
          onChange={(v) => onChange({ notNull: v })}
          label="Not null"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.primaryKey}
          onChange={(v) =>
            onChange({
              primaryKey: v,
              autoIncrement: v ? col.autoIncrement : false,
            })
          }
          label="Primary key"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.unique}
          onChange={(v) => onChange({ unique: v })}
          label="Unique"
          showLabel={false}
        />
      </td>
      <td>
        <ColumnFlag
          checked={col.autoIncrement}
          onChange={(v) => onChange({ autoIncrement: v })}
          label="Auto-increment"
          showLabel={false}
          disabled={!col.primaryKey || !/^integer$/i.test(col.type)}
        />
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <input
            className="sql-rename-input sql-modify-col-default"
            value={col.defaultValue}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder="e.g. 'foo' or 0"
            aria-label="Default value"
          />
        </label>
      </td>
      <td>
        <FkCombobox
          value={col.fkTable}
          onChange={(fkTable) => onChange({ fkTable, fkColumn: "" })}
          options={knownTables}
          placeholder="(none)"
          ariaLabel="Foreign key target table"        />
      </td>
      <td>
        <FkCombobox
          value={col.fkColumn}
          onChange={(fkColumn) => onChange({ fkColumn })}
          options={fkTargetColumns.map((c) => c.name)}
          placeholder="(column)"
          ariaLabel="Foreign key target column"          disabled={!col.fkTable}
        />
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-cascade"
            value={col.fkOnDelete}
            onChange={(e) => onChange({ fkOnDelete: e.target.value })}
            aria-label="On delete cascade action"
            disabled={!col.fkTable}
          >
            {FK_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-cascade"
            value={col.fkOnUpdate}
            onChange={(e) => onChange({ fkOnUpdate: e.target.value })}
            aria-label="On update cascade action"
            disabled={!col.fkTable}
          >
            {FK_ACTIONS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <button
          type="button"
          className="sql-modify-col-remove"
          onClick={onRemove}
          aria-label={`Remove column ${col.name || "unnamed column"}`}
          title="Remove column"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

/** Row for a single generated (computed) column inside the Columns tab.
 *  Generated columns cannot be reordered or have their name/type changed
 *  here, only the expression and storage type (Virtual/Stored) are editable. */
function GeneratedColumnRow({
  col,
  onChange,
  onRemove,
  theme,
}: {
  col: ModifyColumnDraft;
  onChange: (patch: Partial<ModifyColumnDraft>) => void;
  onRemove: () => void;
  theme: string;
}) {
  const gen = col.generated!; // always truthy when this component is rendered
  return (
    <tr className="sql-modify-col-row sql-modify-gen-row">
      <td>
        <div className="sql-modify-gen-name">
          <span className="sql-modify-gen-name-text" title={col.name}>
            {col.name}
          </span>
        </div>
      </td>
      <td className="sql-modify-gen-storage-cell">
        <span className="sql-modify-col-type-badge">{col.type || "—"}</span>
      </td>
      <td className="sql-modify-gen-expr-cell">
        <GenExprEditor
          value={gen.expression}
          onChange={(expression) =>
            onChange({
              generated: { ...gen, expression },
            })
          }
          placeholder="e.g. price * quantity"
          ariaLabel={`Generation expression for ${col.name}`}
          theme={theme}
        />
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-gen-storage"
            value={gen.storageType}
            onChange={(e) =>
              onChange({
                generated: {
                  ...gen,
                  storageType: e.target.value as "VIRTUAL" | "STORED",
                },
              })
            }
            aria-label={`Storage type for ${col.name}`}
          >
            <option value="VIRTUAL">Virtual</option>
            <option value="STORED">Stored</option>
          </select>
        </label>
      </td>
      <td>
        <button
          type="button"
          className="sql-modify-col-remove"
          onClick={onRemove}
          aria-label={`Remove generated column ${col.name || "unnamed column"}`}
          title="Remove column"
        >
          <Trash2 size={13} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

export function ModifyStructureForm({
  state,
  onChange,
  invalidColumnIds,
  knownTables,
  engine,
  onDropLeaf,
  theme,
  activeTab: activeTabProp,
  onTabChange,
  refreshKey,
}: {
  state: ModifyStructureState;
  onChange: (next: ModifyStructureState) => void;
  invalidColumnIds?: Set<string>;
  knownTables: string[];
  engine: SqliteEngine | null;
  /** Called when the user clicks the drop button on an index/trigger item. */
  onDropLeaf?: (name: string, kind: "index" | "trigger") => void;
  /** Editor theme forwarded to inline DdlViewer blocks. */
  theme?: string;
  /** Controlled active tab; if provided the tab state is lifted to the parent. */
  activeTab?: "columns" | "indexes" | "triggers";
  /** Called when the user switches tabs. */
  onTabChange?: (tab: "columns" | "indexes" | "triggers") => void;
  /** Incrementing key that forces re-computation of indexes/triggers. */
  refreshKey?: number;
}) {
  const [internalActiveTab, setInternalActiveTab] = useState<"columns" | "indexes" | "triggers">("columns");
  const activeTab = activeTabProp ?? internalActiveTab;
  const setActiveTab = (tab: "columns" | "indexes" | "triggers") => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };
  const [isDragging, setIsDragging] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [itemDdls, setItemDdls] = useState<Record<string, string>>({});
  const [touchedColIds, setTouchedColIds] = useState<Set<string>>(new Set());
  const [pendingFocusId, setPendingFocusId] = useState<string | null>(null);
  const formBodyRef = useRef<HTMLDivElement | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const toggleStructItem = (name: string, _kind: "index" | "trigger") => {
    const isExpanded = expandedItems.has(name);
    if (!isExpanded && !(name in itemDdls) && engine) {
      try {
        void engine
          .getDDL(name)
          .then((sql) => setItemDdls((prev) => ({ ...prev, [name]: sql })))
          .catch(() => setItemDdls((prev) => ({ ...prev, [name]: "" })));
      } catch {
        setItemDdls((prev) => ({ ...prev, [name]: "" }));
      }
    }
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const updateColumn = (id: string, patch: Partial<ModifyColumnDraft>) => {
    onChange({
      ...state,
      columns: state.columns.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });
  };
  const removeColumn = (id: string) => {
    onChange({
      ...state,
      columns: state.columns.filter((c) => c.id !== id),
    });
  };
  const addColumn = () => {
    // Insert new regular columns before any generated columns so the
    // ordering stays sensible (regular columns first, generated last).
    const firstGenIdx = state.columns.findIndex((c) => c.generated !== null);
    const insertAt = firstGenIdx === -1 ? state.columns.length : firstGenIdx;
    const newId = newDraftId();
    const newCol: ModifyColumnDraft = {
      id: newId,
      originalName: null,
      name: "",
      type: "TEXT",
      notNull: false,
      primaryKey: false,
      autoIncrement: false,
      unique: false,
      defaultValue: "",
      fkTable: "",
      fkColumn: "",
      fkOnDelete: "NO ACTION",
      fkOnUpdate: "NO ACTION",
      generated: null,
    };
    const next = [...state.columns];
    next.splice(insertAt, 0, newCol);
    onChange({ ...state, columns: next });
    setPendingFocusId(newId);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = state.columns.findIndex((c) => c.id === active.id);
    const newIndex = state.columns.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange({ ...state, columns: arrayMove(state.columns, oldIndex, newIndex) });
  };

  useEffect(() => {
    if (!pendingFocusId) return;
    const input = formBodyRef.current?.querySelector<HTMLElement>(
      `[data-col-id="${pendingFocusId}"]`,
    );
    if (input) {
      input.focus();
      setPendingFocusId(null);
    }
  }, [pendingFocusId]);

  // Split columns into regular and generated so they can be rendered
  // in separate sections inside the Columns tab.
  const regularColumns = useMemo(
    () => state.columns.filter((c) => !c.generated),
    [state.columns],
  );
  const generatedColumns = useMemo(
    () => state.columns.filter((c) => c.generated !== null),
    [state.columns],
  );

  const [tableIndexes, setTableIndexes] = useState<string[]>([]);
  const [tableTriggers, setTableTriggers] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!engine || !state.originalName) {
      queueMicrotask(() => {
        if (cancelled) return;
        setTableIndexes([]);
        setTableTriggers([]);
      });
      return;
    }
    void Promise.all([
      engine.listTableIndexes(state.originalName),
      engine.listTableTriggers(state.originalName),
    ])
      .then(([indexes, triggers]) => {
        if (cancelled) return;
        setTableIndexes(indexes);
        setTableTriggers(triggers);
      })
      .catch(() => {
        if (cancelled) return;
        setTableIndexes([]);
        setTableTriggers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [engine, state.originalName, refreshKey]);

  return (
    <div className="sql-modify-body" ref={formBodyRef}>
      <label className="sql-modify-field">
        <span className="sql-modify-field-label">Table name</span>
        <div className="sql-modify-table-name-wrap">
          <Table
            size={14}
            className="sql-modify-table-name-icon"
            aria-hidden="true"
          />
          <input
            className="sql-rename-input sql-modify-table-name-input"
            value={state.newName}
            onChange={(e) => onChange({ ...state, newName: e.target.value })}
          />
        </div>
      </label>

      {/* Tab strip */}
      <div className="sql-struct-tabs">
        <button
          type="button"
          className={`sql-struct-tab${activeTab === "columns" ? " active" : ""}`}
          onClick={() => setActiveTab("columns")}
        >
          Columns
          <span className="sql-struct-tab-count">{state.columns.length}</span>
        </button>
        <button
          type="button"
          className={`sql-struct-tab${activeTab === "indexes" ? " active" : ""}`}
          onClick={() => setActiveTab("indexes")}
        >
          Indexes
          <span className="sql-struct-tab-count">{tableIndexes.length}</span>
        </button>
        <button
          type="button"
          className={`sql-struct-tab${activeTab === "triggers" ? " active" : ""}`}
          onClick={() => setActiveTab("triggers")}
        >
          Triggers
          <span className="sql-struct-tab-count">{tableTriggers.length}</span>
        </button>
      </div>

      {activeTab === "columns" && (
        <>
          <div className="sql-modify-columns">
            {regularColumns.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={regularColumns.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {/* DndContext renders its hidden a11y live-region as a
                      sibling of its children; keep it (and SortableContext)
                      *outside* the <table> so those <div>s never nest
                      directly inside <table> (invalid DOM). */}
                  <div
                    className="sql-modify-table-wrap"
                    style={isDragging ? { overflowX: "hidden" } : undefined}
                  >
                    <table className="sql-modify-table">
                      <thead>
                        <tr className="sql-modify-group-row">
                          <th aria-hidden="true" />
                          <th aria-hidden="true" />
                          <th aria-hidden="true" />
                          <th className="sql-modify-group-label" colSpan={4}>
                            Constraints
                          </th>
                          <th aria-hidden="true" />
                          <th className="sql-modify-group-label" colSpan={4}>
                            Foreign key
                          </th>
                          <th aria-hidden="true" />
                        </tr>
                        <tr>
                          <th className="sql-modify-th-drag" />
                          <th>Name</th>
                          <th style={{ minWidth: "90px" }}>
                            Type <ColumnHeaderPopover pragma="type" />
                          </th>
                          <th className="sql-modify-th-center">
                            Not null <ColumnHeaderPopover pragma="notNull" />
                          </th>
                          <th className="sql-modify-th-center">
                            Primary <ColumnHeaderPopover pragma="primary" />
                          </th>
                          <th className="sql-modify-th-center">
                            Unique <ColumnHeaderPopover pragma="unique" />
                          </th>
                          <th className="sql-modify-th-center">
                            Auto-
                            <br />
                            increment{" "}
                            <ColumnHeaderPopover pragma="autoIncrement" />
                          </th>
                          <th>
                            Default value{" "}
                            <ColumnHeaderPopover pragma="defaultValue" />
                          </th>
                          <th>
                            Table <ColumnHeaderPopover pragma="fkTable" />
                          </th>
                          <th>
                            Column <ColumnHeaderPopover pragma="fkColumn" />
                          </th>
                          <th>
                            On delete <ColumnHeaderPopover pragma="onDelete" />
                          </th>
                          <th>
                            On update <ColumnHeaderPopover pragma="onUpdate" />
                          </th>
                          <th aria-label="Actions" />
                        </tr>
                      </thead>
                      <tbody>
                        {regularColumns.map((col) => (
                          <ModifyColumnRow
                            key={col.id}
                            col={col}
                            onChange={(patch) => updateColumn(col.id, patch)}
                            onRemove={() => removeColumn(col.id)}
                            hasNameError={
                              (invalidColumnIds?.has(col.id) ?? false) ||
                              (touchedColIds.has(col.id) && !col.name.trim())
                            }
                            onBlurName={() =>
                              setTouchedColIds((prev) => new Set([...prev, col.id]))
                            }
                            knownTables={knownTables}
                            engine={engine}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="sql-modify-empty">No columns. Add one below.</div>
            )}
          </div>
          <button
            type="button"
            className="confirm-btn confirm-btn-secondary sql-modify-add"
            onClick={addColumn}
          >
            <Plus size={12} aria-hidden="true" /> Add column
          </button>

          {regularColumns.some(
            (col) =>
              !col.name.trim() &&
              (touchedColIds.has(col.id) || (invalidColumnIds?.has(col.id) ?? false)),
          ) && (
            <div className="sql-modify-validation" role="alert">
              Column names cannot be empty.
            </div>
          )}

          {generatedColumns.length > 0 && (
            <div className="sql-modify-gen-section">
              <div className="sql-modify-gen-section-header">
                Generated columns
              </div>
              <div className="sql-modify-table-wrap">
                <table className="sql-modify-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Expression</th>
                      <th>Storage</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedColumns.map((col) => (
                      <GeneratedColumnRow
                        key={col.id}
                        col={col}
                        onChange={(patch) => updateColumn(col.id, patch)}
                        onRemove={() => removeColumn(col.id)}
                        theme={theme ?? "default"}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === "indexes" && (
        <div className="sql-struct-list">
          {tableIndexes.length === 0 ? (
            <div className="sql-modify-empty">No user-defined indexes.</div>
          ) : (
            tableIndexes.map((name) => {
              const isOpen = expandedItems.has(name);
              const ddl = itemDdls[name] ?? "";
              return (
                <div key={name} className={`sql-struct-list-item sql-struct-list-item-toggle${isOpen ? " is-open" : ""}`}>
                  <div className="sql-struct-list-header">
                    <button
                      type="button"
                      className="sql-struct-list-row"
                      onClick={() => toggleStructItem(name, "index")}
                      aria-expanded={isOpen}
                    >
                      <Hash size={12} className="sql-struct-list-icon" aria-hidden="true" />
                      <span className="sql-struct-list-name">{name}</span>
                      <span className="sql-struct-list-chevron" aria-hidden="true">
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </span>
                    </button>
                    {onDropLeaf && (
                      <button
                        type="button"
                        className="sql-struct-list-drop"
                        onClick={() => onDropLeaf(name, "index")}
                        title={`Drop index ${name}`}
                        aria-label={`Drop index ${name}`}
                      >
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="sql-struct-list-ddl">
                      {ddl.trim() ? (
                        <DdlViewer sql={ddl} theme={theme ?? "default"} />
                      ) : (
                        <div className="sql-modify-empty">No DDL recorded for this index.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "triggers" && (
        <div className="sql-struct-list">
          {tableTriggers.length === 0 ? (
            <div className="sql-modify-empty">No triggers.</div>
          ) : (
            tableTriggers.map((name) => {
              const isOpen = expandedItems.has(name);
              const ddl = itemDdls[name] ?? "";
              return (
                <div key={name} className={`sql-struct-list-item sql-struct-list-item-toggle${isOpen ? " is-open" : ""}`}>
                  <div className="sql-struct-list-header">
                    <button
                      type="button"
                      className="sql-struct-list-row"
                      onClick={() => toggleStructItem(name, "trigger")}
                      aria-expanded={isOpen}
                    >
                      <Zap size={12} className="sql-struct-list-icon" aria-hidden="true" />
                      <span className="sql-struct-list-name">{name}</span>
                      <span className="sql-struct-list-chevron" aria-hidden="true">
                        {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                      </span>
                    </button>
                    {onDropLeaf && (
                      <button
                        type="button"
                        className="sql-struct-list-drop"
                        onClick={() => onDropLeaf(name, "trigger")}
                        title={`Drop trigger ${name}`}
                        aria-label={`Drop trigger ${name}`}
                      >
                        <Trash2 size={11} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="sql-struct-list-ddl">
                      {ddl.trim() ? (
                        <DdlViewer sql={ddl} theme={theme ?? "default"} />
                      ) : (
                        <div className="sql-modify-empty">No DDL recorded for this trigger.</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
