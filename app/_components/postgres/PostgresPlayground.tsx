"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui-components/react/select";
import { Play, Settings2 } from "lucide-react";
import { Toast } from "@base-ui-components/react/toast";
import { PLAYGROUNDS } from "../playgrounds";
import {
  LANGUAGE_ICONS as PLAYGROUND_ICONS,
  LANGUAGE_ICON_COLORS as PLAYGROUND_ICON_COLORS,
  LANGUAGE_ICON_SIZE_FACTOR as PLAYGROUND_ICON_SIZE_FACTOR,
} from "../languageIcons";
import "../playground.css";
import "../sqlPlayground.css";
import { ToastList } from "../sql/components/ToastList";
import { PostgresConnectionPanel } from "./components/PostgresConnectionPanel";
import { ResultView } from "./components/ResultView";
import { SqlEditorPane } from "./components/SqlEditorPane";
import { usePostgresPlaygroundStore } from "./stores/usePostgresPlaygroundStore";

const PLAYGROUND_ID = "postgres";

function PostgresPlaygroundInner() {
  const router = useRouter();
  const result = usePostgresPlaygroundStore((s) => s.result);
  const statusMessage = usePostgresPlaygroundStore((s) => s.statusMessage);
  const connected = usePostgresPlaygroundStore((s) => s.connected);
  const runMockQuery = usePostgresPlaygroundStore((s) => s.runMockQuery);

  return (
    <div className="pg-root">
      <div className="pg-app">
        <header className="pg-header">
          <div className="logo">
            <Link href="/" aria-label="Dataslope home">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo" />
            </Link>
            <Link href="/" className="brand-name">Dataslope</Link>
            <Select.Root
              value={PLAYGROUND_ID}
              onValueChange={(value) => {
                const next = PLAYGROUNDS.find((p) => p.id === value);
                if (next && next.id !== PLAYGROUND_ID) router.push(next.href);
              }}
            >
              <Select.Trigger className="playground-switcher" aria-label="Switch playground">
                {(() => {
                  const Icon = PLAYGROUND_ICONS[PLAYGROUND_ID];
                  const color = PLAYGROUND_ICON_COLORS[PLAYGROUND_ID];
                  const factor = PLAYGROUND_ICON_SIZE_FACTOR[PLAYGROUND_ID] ?? 1;
                  return Icon ? (
                    <span className="playground-switcher-lang-icon" style={{ color }} aria-hidden="true">
                      <Icon size={Math.round(16 * factor)} />
                    </span>
                  ) : null;
                })()}
                <Select.Value />
                <Select.Icon className="playground-switcher-icon">
                  <svg viewBox="0 0 12 12" width={10} height={10}>
                    <polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner className="pg-lang-switcher-positioner" sideOffset={6} alignItemWithTrigger={false}>
                  <Select.Popup className="bui-select-popup pg-lang-switcher-popup">
                    {PLAYGROUNDS.map((p) => {
                      const Icon = PLAYGROUND_ICONS[p.id];
                      const color = PLAYGROUND_ICON_COLORS[p.id];
                      const factor = PLAYGROUND_ICON_SIZE_FACTOR[p.id] ?? 1;
                      return (
                        <Select.Item key={p.id} value={p.id} className="bui-select-item">
                          {Icon && <span className="bui-select-item-icon" style={{ color }} aria-hidden="true"><Icon size={Math.round(16 * factor)} /></span>}
                          <Select.ItemText>{p.label}</Select.ItemText>
                        </Select.Item>
                      );
                    })}
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
          <div className="header-sep" />
          <div className="header-actions desktop-only">
            <button className="header-btn" type="button" disabled title="Settings placeholder">
              <Settings2 size={14} aria-hidden="true" />
              <span className="btn-label">Settings</span>
            </button>
            <button className="run-btn" type="button" onClick={runMockQuery}>
              <Play size={15} aria-hidden="true" />
              <span>{connected ? "Run Mock" : "Preview Mock"}</span>
            </button>
          </div>
        </header>
        <div className="sql-shell postgres-shell">
          <PostgresConnectionPanel />
          <div className="sql-sidebar-resizer" role="separator" aria-orientation="vertical" />
          <main className="sql-panes postgres-panes">
            <SqlEditorPane />
            <div className="sql-resizer" role="separator" aria-orientation="horizontal" />
            <section className="sql-results-pane">
              <div className="postgres-status">{statusMessage}</div>
              <ResultView result={result} />
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function PostgresPlayground() {
  return (
    <Toast.Provider timeout={2400}>
      <PostgresPlaygroundInner />
      <Toast.Portal>
        <Toast.Viewport className="toast-viewport">
          <ToastList />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}
