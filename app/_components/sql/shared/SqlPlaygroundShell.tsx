"use client";

import { useCallback, useMemo, useState } from "react";
import type { SqlEngineAdapter, SqlSample } from "./SqlEngineAdapter";

export interface SqlShellTab {
  id: string;
  title: string;
  code: string;
  pristineCode: string;
}

export interface SqlShellState {
  tabs: SqlShellTab[];
  activeTabId: string;
}

export interface SqlPlaygroundShellProps {
  adapter: SqlEngineAdapter;
  sampleId?: string;
}

interface ShellStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const DEFAULT_SQL = "-- Start writing SQL here\nSELECT 1;";

export function createSqlShellTabId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `shell_${crypto.randomUUID()}`;
  }

  return `shell_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function sqlShellStorageKey(
  storagePrefix: string,
  sampleId: string,
): string {
  return `${storagePrefix}:shell:${sampleId}:tabs`;
}

export function defaultSqlShellTabs(sample: SqlSample): SqlShellTab[] {
  const seeds = sample.defaultTabs?.length
    ? sample.defaultTabs
    : [{ title: "Query 1", code: DEFAULT_SQL }];

  return seeds.map((seed) => ({
    id: createSqlShellTabId(),
    title: seed.title,
    code: seed.code,
    pristineCode: seed.code,
  }));
}

function normalizeTabs(value: unknown): SqlShellTab[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const tabs = value.flatMap((tab): SqlShellTab[] => {
    if (typeof tab !== "object" || tab === null) return [];
    const candidate = tab as Partial<SqlShellTab>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.title !== "string" ||
      typeof candidate.code !== "string"
    ) {
      return [];
    }

    return [
      {
        id: candidate.id,
        title: candidate.title,
        code: candidate.code,
        pristineCode:
          typeof candidate.pristineCode === "string"
            ? candidate.pristineCode
            : candidate.code,
      },
    ];
  });

  return tabs.length > 0 ? tabs : null;
}

export function loadSqlShellState(
  storage: ShellStorage | null,
  storagePrefix: string,
  sample: SqlSample,
): SqlShellState {
  const key = sqlShellStorageKey(storagePrefix, sample.id);
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SqlShellState>;
        const tabs = normalizeTabs(parsed.tabs);
        const activeTabId =
          typeof parsed.activeTabId === "string" ? parsed.activeTabId : "";

        if (tabs) {
          return {
            tabs,
            activeTabId: tabs.some((tab) => tab.id === activeTabId)
              ? activeTabId
              : tabs[0].id,
          };
        }
      }
    } catch {
      // Corrupt persisted shell state falls back to sample defaults.
    }
  }

  const tabs = defaultSqlShellTabs(sample);
  return { tabs, activeTabId: tabs[0].id };
}

export function saveSqlShellState(
  storage: ShellStorage | null,
  storagePrefix: string,
  sampleId: string,
  state: SqlShellState,
): void {
  if (!storage) return;

  try {
    storage.setItem(
      sqlShellStorageKey(storagePrefix, sampleId),
      JSON.stringify(state),
    );
  } catch {
    // Quota exceeded / private mode — ignore just like the existing playgrounds.
  }
}

export function addSqlShellTab(state: SqlShellState): SqlShellState {
  const nextTabNumber = state.tabs.length + 1;
  const nextTab: SqlShellTab = {
    id: createSqlShellTabId(),
    title: `Query ${nextTabNumber}`,
    code: "",
    pristineCode: "",
  };

  return {
    tabs: [...state.tabs, nextTab],
    activeTabId: nextTab.id,
  };
}

export function updateSqlShellTabCode(
  state: SqlShellState,
  tabId: string,
  code: string,
): SqlShellState {
  return {
    ...state,
    tabs: state.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, code } : tab,
    ),
  };
}

function getBrowserStorage(): ShellStorage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function SqlPlaygroundShell({
  adapter,
  sampleId,
}: SqlPlaygroundShellProps) {
  const sample = useMemo(() => {
    const samples = adapter.listSamples();
    return (
      (sampleId ? adapter.findSample(sampleId) : undefined) ??
      samples[0] ?? {
        id: "default",
        label: adapter.displayName,
        filename: "",
      }
    );
  }, [adapter, sampleId]);

  const storage = getBrowserStorage();
  const [state, setState] = useState<SqlShellState>(() =>
    loadSqlShellState(storage, adapter.storagePrefix, sample),
  );

  const activeTab = state.tabs.find((tab) => tab.id === state.activeTabId);

  const persist = useCallback(
    (next: SqlShellState) => {
      saveSqlShellState(storage, adapter.storagePrefix, sample.id, next);
      return next;
    },
    [adapter.storagePrefix, sample.id, storage],
  );

  const handleAddTab = useCallback(() => {
    setState((current) => persist(addSqlShellTab(current)));
  }, [persist]);

  const handleCodeChange = useCallback(
    (code: string) => {
      if (!activeTab) return;
      setState((current) =>
        persist(updateSqlShellTabCode(current, activeTab.id, code)),
      );
    },
    [activeTab, persist],
  );

  return (
    <section
      aria-label={`${adapter.displayName} SQL playground shell scaffold`}
      className="flex h-full min-h-0 flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        {state.tabs.map((tab) => (
          <button
            className={tab.id === activeTab?.id ? "font-semibold" : undefined}
            key={tab.id}
            onClick={() =>
              setState((current) =>
                persist({ ...current, activeTabId: tab.id }),
              )
            }
            type="button"
          >
            {tab.title}
          </button>
        ))}
        <button onClick={handleAddTab} type="button">
          Add tab
        </button>
      </div>

      <textarea
        aria-label="SQL editor scaffold"
        className="min-h-48 w-full flex-1 rounded border p-3 font-mono text-sm"
        onChange={(event) => handleCodeChange(event.target.value)}
        value={activeTab?.code ?? ""}
      />

      <pre className="overflow-auto rounded bg-neutral-950 p-3 text-xs text-neutral-100">
        {JSON.stringify(
          {
            dialect: adapter.dialect,
            sampleId: sample.id,
            activeTabCode: activeTab?.code ?? "",
          },
          null,
          2,
        )}
      </pre>
    </section>
  );
}
