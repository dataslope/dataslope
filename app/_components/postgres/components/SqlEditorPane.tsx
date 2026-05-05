"use client";

import { Plus } from "lucide-react";
import { usePostgresPlaygroundStore } from "../stores/usePostgresPlaygroundStore";

export function SqlEditorPane() {
  const tabs = usePostgresPlaygroundStore((s) => s.tabs);
  const activeTabId = usePostgresPlaygroundStore((s) => s.activeTabId);
  const setActiveTab = usePostgresPlaygroundStore((s) => s.setActiveTab);
  const setTabSql = usePostgresPlaygroundStore((s) => s.setTabSql);
  const addTab = usePostgresPlaygroundStore((s) => s.addTab);
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <div className="postgres-editor-pane">
      <div className="sql-tabbar">
        <div className="sql-tabs" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`sql-tab${tab.id === activeTabId ? " active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={tab.id === activeTabId}
            >
              <span className="sql-tab-title">{tab.title}</span>
            </button>
          ))}
        </div>
        <button type="button" className="sql-new-tab" onClick={addTab}>
          <Plus size={13} aria-hidden="true" />
        </button>
      </div>
      <textarea
        className="postgres-editor-mock"
        value={activeTab?.sql ?? ""}
        onChange={(event) => activeTab && setTabSql(activeTab.id, event.target.value)}
        spellCheck={false}
        aria-label="Postgres SQL editor placeholder"
      />
    </div>
  );
}
