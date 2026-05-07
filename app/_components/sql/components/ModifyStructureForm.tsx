"use client";

import { useState, useMemo } from "react";
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
import { Checkbox } from "@base-ui-components/react/checkbox";
import {
  ChevronDown,
  ChevronRight,
  GripVertical,
  Hash,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import type { ModifyColumnDraft } from "../types";
import type { TableColumnInfo, SqliteEngine } from "../../runtime/sqlite";
import { COLUMN_TYPES, FK_ACTIONS } from "../constants";
import { DdlViewer } from "./DdlViewer";
import { ColumnHeaderPopover } from "./PragmaSettingsTab";

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
  knownTables,
  engine,
}: {
  col: ModifyColumnDraft;
  onChange: (patch: Partial<ModifyColumnDraft>) => void;
  onRemove: () => void;
  hasNameError?: boolean;
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

  const fkTargetColumns = useMemo(() => {
    if (!engine || !col.fkTable) return [] as TableColumnInfo[];
    try {
      return engine.listColumns(col.fkTable);
    } catch {
      return [] as TableColumnInfo[];
    }
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
            placeholder="column name"
            aria-label="Column name"
          />
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-col-type-select"
            value={col.type}
            onChange={(e) => onChange({ type: e.target.value })}
            aria-label="Column type"
          >
            {COLUMN_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
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
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-table"
            value={col.fkTable}
            onChange={(e) =>
              onChange({ fkTable: e.target.value, fkColumn: "" })
            }
            aria-label="Foreign key target table"
          >
            <option value="">(none)</option>
            {knownTables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </td>
      <td>
        <label className="sql-modify-cell-field">
          <select
            className="sql-modify-col-type sql-modify-fk-column"
            value={col.fkColumn}
            onChange={(e) => onChange({ fkColumn: e.target.value })}
            aria-label="Foreign key target column"
            disabled={!col.fkTable}
          >
            <option value="">(column)</option>
            {fkTargetColumns.map((c) => (
              <option key={c.cid} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const toggleStructItem = (name: string, _kind: "index" | "trigger") => {
    const isExpanded = expandedItems.has(name);
    if (!isExpanded && !(name in itemDdls) && engine) {
      try {
        const sql = engine.getDDL(name);
        setItemDdls((prev) => ({ ...prev, [name]: sql }));
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
    onChange({
      ...state,
      columns: [
        ...state.columns,
        {
          id: newDraftId(),
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
        },
      ],
    });
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

  const tableIndexes = useMemo(() => {
    if (!engine || !state.originalName) return [] as string[];
    try {
      return engine.listTableIndexes(state.originalName);
    } catch {
      return [] as string[];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, state.originalName, refreshKey]);

  const tableTriggers = useMemo(() => {
    if (!engine || !state.originalName) return [] as string[];
    try {
      return engine.listTableTriggers(state.originalName);
    } catch {
      return [] as string[];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, state.originalName, refreshKey]);

  return (
    <div className="sql-modify-body">
      <label className="sql-modify-field">
        <span className="sql-modify-field-label">Table name</span>
        <input
          className="sql-rename-input"
          value={state.newName}
          onChange={(e) => onChange({ ...state, newName: e.target.value })}
        />
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
            {state.columns.length > 0 ? (
              <div
                className="sql-modify-table-wrap"
                style={isDragging ? { overflowX: "hidden" } : undefined}
              >
                <table className="sql-modify-table">
                  <thead>
                    <tr>
                      <th className="sql-modify-th-drag" />
                      <th>Name</th>
                      <th style={{ minWidth: "90px" }}>
                        Type <ColumnHeaderPopover pragma="type" />
                      </th>
                      <th>
                        Not null <ColumnHeaderPopover pragma="notNull" />
                      </th>
                      <th>
                        Primary <ColumnHeaderPopover pragma="primary" />
                      </th>
                      <th>
                        Unique <ColumnHeaderPopover pragma="unique" />
                      </th>
                      <th>
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
                        FK table <ColumnHeaderPopover pragma="fkTable" />
                      </th>
                      <th>
                        FK column <ColumnHeaderPopover pragma="fkColumn" />
                      </th>
                      <th>
                        On delete <ColumnHeaderPopover pragma="onDelete" />
                      </th>
                      <th>
                        On update <ColumnHeaderPopover pragma="onUpdate" />
                      </th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={state.columns.map((c) => c.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {state.columns.map((col) => (
                          <ModifyColumnRow
                            key={col.id}
                            col={col}
                            onChange={(patch) => updateColumn(col.id, patch)}
                            onRemove={() => removeColumn(col.id)}
                            hasNameError={invalidColumnIds?.has(col.id) ?? false}
                            knownTables={knownTables}
                            engine={engine}
                          />
                        ))}
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
              </div>
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
