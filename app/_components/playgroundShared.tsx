"use client";

// Shared chrome that every playground (Python, R, …, SQLite) uses so
// the Settings panel, runtime info popover, run-overlay animation, and
// loading screen stay visually and behaviorally identical across
// playgrounds. Extracted from `Playground.tsx` so a non-adapter-driven
// playground (the SQL playground) can mount the same components without
// duplicating them.

import { useCallback, useState, type ReactNode } from "react";
import { Switch } from "@base-ui-components/react/switch";
import { Tabs } from "@base-ui-components/react/tabs";
import {
  ALargeSmall,
  Eraser,
  RotateCcw,
  Sliders,
  SunMoon,
  Trash2,
  WrapText,
  X,
} from "lucide-react";
import { ThemePillToggle } from "./ThemePillToggle";
import type { RuntimeInfo } from "./types";

/** Small clipboard / "copy to clipboard" glyph shared by the editor
 *  pane bar, output cell headers, and the split-editor pane headers.
 *  Stroked rather than filled so it visually matches the pane-bar
 *  icons. */
export function CopyIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="13"
      height="13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-5A1.5 1.5 0 0 0 3 3.5v5A1.5 1.5 0 0 0 4.5 10H5" />
    </svg>
  );
}

/** Built-in defaults for the per-language playground settings. Used
 *  both when hydrating an unconfigured playground from localStorage and
 *  when the user clicks "Restore default settings", so the two paths
 *  can never drift out of sync. */
export const DEFAULT_PLAYGROUND_SETTINGS = {
  fontSize: 14,
  outputFontSize: 13,
  outputFontSizeEnabled: false,
  editorTheme: "github-light",
  wordWrap: true,
  clearBeforeRun: true,
} as const;

/** Cheeky one-liners cycled below the loading hero while the runtime
 *  initialises. Shared so the SQL playground's loading screen feels the
 *  same as the language playgrounds. */
export const LOADING_QUIPS: string[] = [
  "Bribing the WebAssembly elves with cookies…",
  "Convincing electrons to behave for a few seconds…",
  "Polishing semicolons and warming up the runtime…",
  "Asking the parser nicely to be on its best behavior…",
  "Inflating bytecode like a tiny digital balloon…",
  "Negotiating with the JIT for a discount…",
  "Stretching before the first execution lap…",
  "Teaching the heap some new manners…",
  "Wiring up the standard library, one cable at a time…",
  "Loading dependencies, and a healthy dose of optimism…",
  "Fetching brain cells from the CDN…",
  "Spinning up the hamster wheel, please clap…",
  "Composing a haiku for your first run…",
  "Reticulating splines (it's a thing)…",
  "Brewing a fresh pot of bytes…",
  "Untangling pointers (don't ask)…",
  "Rolling 1d20 against load times, nat 20!",
  "Counting to infinity. Twice. Quickly.",
  "Reading the manual. Don't tell anyone.",
  "Compressing entropy into adorable little packets…",
];

/** Detect desktop macOS so we can show the user the actual modifier
 *  key combo for the run shortcut (⌘ Enter on macOS, Ctrl Enter
 *  everywhere else). Defaults to false during SSR. */
export function detectIsMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  const ua = navigator.userAgent || "";
  const isIpadOS =
    /^Mac/.test(platform) && (navigator.maxTouchPoints ?? 0) > 1;
  if (isIpadOS) return false;
  if (/iPhone|iPad|iPod/i.test(ua)) return false;
  return /Mac/i.test(platform) || /Macintosh/i.test(ua);
}

/** The wave/glow overlay shown in the editor pane while a run is in
 *  flight. Used by both the language playgrounds (over the output pane)
 *  and the SQL playground (over the data panel). */
export function DataslopeRunOverlay({
  running,
  variant,
}: {
  running: boolean;
  variant?: "mobile";
}) {
  const cls = [
    "dataslope-run-overlay",
    running ? "active" : "",
    variant === "mobile" ? "dataslope-run-overlay--mobile" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} aria-hidden="true">
      <div className="dataslope-glow" />
      <svg
        className="dataslope-waves"
        viewBox="0 0 240 40"
        preserveAspectRatio="none"
      >
        <path
          className="dataslope-wave dataslope-wave--back"
          d="M0 26 C 20 14, 40 14, 60 26 S 100 38, 120 26 S 160 14, 180 26 S 220 38, 240 26 S 280 14, 300 26 S 340 38, 360 26 S 400 14, 420 26 S 460 38, 480 26 L 480 40 L 0 40 Z"
        />
        <path
          className="dataslope-wave dataslope-wave--front"
          d="M0 30 C 20 20, 40 20, 60 30 S 100 40, 120 30 S 160 20, 180 30 S 220 40, 240 30 S 280 20, 300 30 S 340 40, 360 30 S 400 20, 420 30 S 460 40, 480 30 L 480 40 L 0 40 Z"
        />
      </svg>
      <div className="dataslope-stream" />
    </div>
  );
}

/** Placeholder shown inside the ER-diagram tab area while the
 *  ErDiagramPane chunk is being lazily loaded. Renders the same
 *  bottom-anchored wave animation that ErDiagramPane shows during the
 *  ELK layout computation, so there is no visible gap between the two
 *  phases. */
export function ErDiagramLoadingFallback() {
  return (
    <div className="er-diagram-wrap">
      <div className="er-diagram-loading-overlay" aria-hidden="true">
        <div className="er-diagram-loading-wave">
          <svg viewBox="0 0 240 40" preserveAspectRatio="none">
            <path
              className="dataslope-wave dataslope-wave--back"
              d="M0 26 C 20 14, 40 14, 60 26 S 100 38, 120 26 S 160 14, 180 26 S 220 38, 240 26 S 280 14, 300 26 S 340 38, 360 26 S 400 14, 420 26 S 460 38, 480 26 L 480 40 L 0 40 Z"
            />
            <path
              className="dataslope-wave dataslope-wave--front"
              d="M0 30 C 20 20, 40 20, 60 30 S 100 40, 120 30 S 160 20, 180 30 S 220 40, 240 30 S 280 20, 300 30 S 340 40, 360 30 S 400 20, 420 30 S 460 40, 480 30 L 480 40 L 0 40 Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

/** Body of the runtime-info popover (the small info button in the
 *  header). Surfaces language/runtime/version + a GitHub link. Reused
 *  verbatim by the SQL playground. */
export function RuntimeInfoContent({ info }: { info: RuntimeInfo }) {
  return (
    <>
      <div className="info-popover-row">
        <span className="info-popover-label">Language</span>
        <span className="info-popover-val">
          {info.language} {info.version}
        </span>
      </div>
      <div className="info-popover-row">
        <span className="info-popover-label">Runtime</span>
        <span className="info-popover-val">
          {info.engineUrl ? (
            <a href={info.engineUrl} target="_blank" rel="noreferrer">
              {info.engine}
            </a>
          ) : (
            info.engine
          )}
        </span>
      </div>
      <div className="info-popover-row">
        <span className="info-popover-label">GitHub</span>
        <span className="info-popover-val">
          <a
            href="https://github.com/dataslope/dataslope"
            target="_blank"
            rel="noreferrer"
            className="info-github-link"
          >
            <svg
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Dataslope
          </a>
        </span>
      </div>
      {info.notes && <div className="info-popover-notes">{info.notes}</div>}
    </>
  );
}

export interface SettingsPanelProps {
  fontSize: number;
  setFontSize: (n: number) => void;
  outputFontSizeEnabled: boolean;
  setOutputFontSizeEnabled: (b: boolean) => void;
  outputFontSize: number;
  setOutputFontSize: (n: number) => void;
  editorTheme: string;
  setEditorTheme: (t: string) => void;
  wordWrap: boolean;
  setWordWrap: (b: boolean) => void;
  clearBeforeRun: boolean;
  setClearBeforeRun: (b: boolean) => void;
  /** Adapter id used to render a representative snippet inside each
   *  theme preview card (`"python"`, `"r"`, `"sqlite"`, …). */
  language: string;
  /** Optional override for the "Use Different Font Size for Outputs"
   *  row label, the SQL playground uses "Results" instead. */
  outputFontSizeLabel?: string;
  /** Whether to render the output/result font-size controls. */
  showOutputFontSizeControls?: boolean;
  /** Optional override for the "Clear Output Before Running" row label
   *, the SQL playground says "Clear Results Before Running". */
  clearBeforeRunLabel?: string;
  /** Whether to render the "Clear Output/Results Before Running" row.
   *  SQL playgrounds set this to false, the option only applies to
   *  non-SQL playgrounds where outputs are appended. Defaults to true. */
  showClearBeforeRunRow?: boolean;
  onRestoreDefaults: () => void;
  onClearLocalStorage: () => void;
  /** Wipe every browser-side storage surface this app uses
   *  (localStorage + sessionStorage + OPFS + IndexedDB + caches) and
   *  reload. More thorough than `onClearLocalStorage`. Optional so
   *  callers can opt into surfacing the action, when omitted the row
   *  is hidden. */
  onClearAllLocalData?: () => void;
  /** Optional extra rows appended inside the General tab, used by the
   *  SQL playground to surface a per-DB "Reset query tabs" action. */
  extraGeneralRows?: ReactNode;
  /** Optional extra action buttons prepended inside the `.settings-actions`
   *  group, used by the SQL playground to surface "Reset query tabs" next
   *  to the other destructive actions so all three form one grouped button. */
  extraActionRows?: ReactNode;
  /** Optional extra settings tabs rendered after "Editor Themes". Each
   *  entry provides the tab trigger and its panel content. Used by the
   *  SQL playground to surface the Pragmas tab. */
  extraTabs?: Array<{
    value: string;
    trigger: ReactNode;
    panel: ReactNode;
  }>;
  /** Close the Settings tab. When provided, a ✕ button is rendered at
   *  the far right of the settings tab bar (after the last tab). */
  onClose?: () => void;
}

/** Tabbed settings UI body (General + Editor Themes + extra tabs)
 *  shared across all playgrounds. Rendered inline inside a tab pane in
 *  every playground, the legacy modal-dialog form has been retired in
 *  favour of the "Settings as a tab" affordance. */
export function SettingsPanelContent({
  fontSize,
  setFontSize,
  outputFontSizeEnabled,
  setOutputFontSizeEnabled,
  outputFontSize,
  setOutputFontSize,
  wordWrap,
  setWordWrap,
  clearBeforeRun,
  setClearBeforeRun,
  outputFontSizeLabel,
  showOutputFontSizeControls = true,
  clearBeforeRunLabel,
  showClearBeforeRunRow = true,
  onRestoreDefaults,
  onClearLocalStorage,
  onClearAllLocalData,
  extraGeneralRows,
  extraActionRows,
  extraTabs,
  onClose,
}: SettingsPanelProps) {
  const [tab, setTab] = useState<string>(() => {
    try {
      return localStorage.getItem("settings_active_tab") ?? "general";
    } catch {
      return "general";
    }
  });

  const handleTabChange = useCallback((v: string | number | null) => {
    const next = String(v);
    setTab(next);
    try {
      localStorage.setItem("settings_active_tab", next);
    } catch {
      // ignore
    }
  }, []);

  return (
    <Tabs.Root
      value={tab}
      onValueChange={handleTabChange}
      className="settings-tabs"
    >
      <Tabs.List
        className="settings-tabs-list"
        aria-label="Settings sections"
      >
        <Tabs.Tab value="general" className="settings-tab">
          <Sliders size={14} aria-hidden="true" />
          <span className="settings-tab-label">General</span>
        </Tabs.Tab>
        {extraTabs?.map((t) => (
          <Tabs.Tab key={t.value} value={t.value} className="settings-tab">
            {t.trigger}
          </Tabs.Tab>
        ))}
        {onClose && (
          <button
            type="button"
            className="settings-tabs-close"
            aria-label="Close settings"
            title="Close settings"
            onClick={onClose}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </Tabs.List>

      <Tabs.Panel value="general" className="settings-panel-pane">
        <div className="settings-body">
          <div className="setting-row">
            <div className="setting-label">
              <ALargeSmall size={14} aria-hidden="true" />
              <span>Editor Font Size</span>
            </div>
            <div className="font-size-row">
              <input
                type="range"
                className="fs-slider"
                min={10}
                max={22}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
              <span className="font-size-val">{fontSize}px</span>
            </div>
          </div>

          {showOutputFontSizeControls && (
            <div className="setting-row">
              <label className="setting-checkbox-row">
                <input
                  type="checkbox"
                  checked={outputFontSizeEnabled}
                  onChange={(e) =>
                    setOutputFontSizeEnabled(e.target.checked)
                  }
                />
                <span>
                  {outputFontSizeLabel ??
                    "Use Different Font Size for Outputs"}
                </span>
              </label>
              <div
                className={`font-size-row${outputFontSizeEnabled ? "" : " disabled"
                  }`}
              >
                <input
                  type="range"
                  className="fs-slider"
                  min={10}
                  max={22}
                  step={1}
                  value={outputFontSizeEnabled ? outputFontSize : fontSize}
                  onChange={(e) =>
                    setOutputFontSize(Number(e.target.value))
                  }
                  disabled={!outputFontSizeEnabled}
                  aria-label="Output font size"
                />
                <span className="font-size-val">{outputFontSizeEnabled ? outputFontSize : fontSize}px</span>
              </div>
            </div>
          )}

          <div className="setting-row">
            <label className="setting-switch-row">
              <span className="setting-switch-label">
                <WrapText size={14} aria-hidden="true" />
                <span>Word Wrap</span>
              </span>
              <Switch.Root
                checked={wordWrap}
                onCheckedChange={setWordWrap}
                className="bui-switch"
              >
                <Switch.Thumb className="bui-switch-thumb" />
              </Switch.Root>
            </label>
          </div>

          {showClearBeforeRunRow && (
            <div className="setting-row">
              <label className="setting-switch-row">
                <span className="setting-switch-label">
                  <Eraser size={14} aria-hidden="true" />
                  <span>
                    {clearBeforeRunLabel ?? "Clear Output Before Running"}
                  </span>
                </span>
                <Switch.Root
                  checked={clearBeforeRun}
                  onCheckedChange={setClearBeforeRun}
                  className="bui-switch"
                >
                  <Switch.Thumb className="bui-switch-thumb" />
                </Switch.Root>
              </label>
            </div>
          )}

          <div className="setting-row">
            <label className="setting-switch-row">
              <span className="setting-switch-label">
                <SunMoon size={14} aria-hidden="true" />
                <span>Appearance</span>
              </span>
              <ThemePillToggle />
            </label>
          </div>

          {extraGeneralRows}

          <div className="settings-actions">
            <div className="settings-actions-group">
              {extraActionRows}
              <button
                type="button"
                className="settings-action-btn"
                onClick={onRestoreDefaults}
              >
                <span className="settings-action-icon" aria-hidden="true">
                  <RotateCcw size={14} />
                </span>
                <span className="settings-action-label">
                  Restore default settings
                </span>
              </button>
            </div>
            <div className="settings-actions-group settings-actions-group-danger">
              <button
                type="button"
                className="settings-action-btn settings-action-danger"
                onClick={onClearLocalStorage}
              >
                <span className="settings-action-icon" aria-hidden="true">
                  <Trash2 size={14} />
                </span>
                <span className="settings-action-label">
                  Clear all localStorage data
                </span>
              </button>
              {onClearAllLocalData && (
                <button
                  type="button"
                  className="settings-action-btn settings-action-danger"
                  onClick={onClearAllLocalData}
                >
                  <span className="settings-action-icon" aria-hidden="true">
                    <Trash2 size={14} />
                  </span>
                  <span className="settings-action-label">
                    Clear all local data (storage + OPFS)
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </Tabs.Panel>

      {extraTabs?.map((t) => (
        <Tabs.Panel key={t.value} value={t.value} className="settings-panel-pane">
          {t.panel}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  );
}
