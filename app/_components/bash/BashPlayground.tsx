"use client";

/**
 * The Bash playground: terminals you can split, the way you would split a
 * terminal.
 *
 * One session, one filesystem, one shell per terminal. Every terminal sees
 * the same files; each has its own working directory, environment, functions
 * and history, which is what a split means in tmux and iTerm and what a
 * learner expects it to mean. A new terminal starts where the one it was
 * split from is standing.
 *
 * Memory-only, and nothing persists: a reload is one terminal and the
 * starting files. The layout is a binary split tree (`splitTree.ts`); on a phone
 * the same terminals are a tab strip and the tree is kept for when the
 * viewport grows back.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui/react/select";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Plus, RotateCcw, SplitSquareHorizontal, SplitSquareVertical, X } from "lucide-react";
import Link from "../Link";
import { PLAYGROUNDS } from "../playgrounds";
import { useIsFramed } from "../useIsFramed";
import { LANGUAGE_ICONS, LANGUAGE_ICON_SIZE_FACTOR } from "../languageIcons";
import { PlaygroundBootOverlay, useBootOverlayVisibility } from "../PlaygroundBootOverlay";
import { applyThemePalette, getStoredEditorTheme, applyMode } from "../playgroundTheme";
import { useGitSession } from "../git/gitRuntime";
import menuStyles from "../sqlCardTools/SqlCardToolsMenu.module.css";
import { DEFAULT_BASH_SCENARIO } from "./bashScenarios";
import { HOME } from "./prompt";
import { SplitView, MIN_PANE } from "./SplitView";
import { TerminalPane, type MoveDir, type PaneDragHandlers } from "./TerminalPane";
import {
  dropZone as zoneAt,
  leaf,
  leaves,
  move,
  neighbor,
  remove,
  resize,
  split,
  swap,
  type Dir,
  type Edge,
  type Node,
  type Rect,
} from "./splitTree";
import "../playground.css";
import "./bashPlayground.css";

/** Past this the split tree is unreadable on any screen, and each terminal
 *  holds a scrollback. One constant, to feel out. */
export const MAX_TERMINALS = 8;

interface PaneRecord {
  id: string;
  title: string;
  /** Where the shell was opened; the prompt before its first command. */
  startCwd: string;
}

type Drag = {
  id: string;
  startX: number;
  startY: number;
  active: boolean;
  target: { id: string; zone: Edge | "center" } | null;
};

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export default function BashPlayground() {
  const router = useRouter();
  const embedded = useIsFramed();
  const mobile = useMediaQuery("(max-width: 860px)");
  const session = useGitSession(DEFAULT_BASH_SCENARIO, "bash-playground", "bash");
  const { ready, error, reset, openShell, closeShell } = session;

  const [tree, setTree] = useState<Node>(() => leaf("t1"));
  const [panes, setPanes] = useState<PaneRecord[]>([{ id: "t1", title: "bash 1", startCwd: HOME }]);
  const [focusId, setFocusId] = useState("t1");
  const [resetToken, setResetToken] = useState(0);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const seq = useRef(1);
  const stage = useRef<HTMLDivElement>(null);
  const cwdOf = useRef(new Map<string, string>());

  const overlay = useBootOverlayVisibility(ready || Boolean(error));
  const order = useMemo(() => leaves(tree), [tree]);
  const count = order.length;
  const canSplit = count < MAX_TERMINALS;

  // The shared editor theme, and the same default as every other playground.
  useEffect(() => {
    const theme = getStoredEditorTheme() ?? "github-light";
    applyThemePalette(theme);
    applyMode(theme);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2200);
    return () => clearTimeout(t);
  }, [notice]);

  /** The rendered rectangle of every pane, for direction-aware focus and for
   *  telling which pane a drag is over. */
  const rects = useCallback((): Record<string, Rect> => {
    const out: Record<string, Rect> = {};
    stage.current?.querySelectorAll<HTMLElement>("[data-pane]").forEach((el) => {
      const r = el.getBoundingClientRect();
      out[el.dataset.pane ?? ""] = { x: r.left, y: r.top, width: r.width, height: r.height };
    });
    return out;
  }, []);

  const paneCwd = (id: string) => cwdOf.current.get(id) ?? panes.find((p) => p.id === id)?.startCwd ?? HOME;

  /** A new terminal beside `fromId`, in its directory. */
  const addPane = useCallback(
    (fromId: string, dir: Dir) => {
      if (!canSplit) {
        setNotice(`Up to ${MAX_TERMINALS} terminals. Close one to open another.`);
        return;
      }
      // Refuse a split the pane cannot fit rather than producing one that
      // wraps every word of its prompt.
      const r = rects()[fromId];
      if (!mobile && r && (dir === "row" ? r.width : r.height) < MIN_PANE[dir] * 2 + 6) {
        setNotice("Not enough room to split this terminal. Resize it or split another.");
        return;
      }
      const n = (seq.current += 1);
      const id = `t${n}`;
      const startCwd = paneCwd(fromId);
      void openShell(id, startCwd);
      setPanes((p) => [...p, { id, title: `bash ${n}`, startCwd }]);
      setTree((t) => split(t, fromId, dir, id));
      setFocusId(id);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- paneCwd reads refs and current panes
    [canSplit, mobile, openShell, rects],
  );

  const closePane = useCallback(
    (id: string) => {
      if (count <= 1) return;
      const idx = order.indexOf(id);
      const next = order[idx + 1] ?? order[idx - 1] ?? order[0];
      void closeShell(id);
      setTree((t) => remove(t, id));
      setPanes((p) => p.filter((x) => x.id !== id));
      cwdOf.current.delete(id);
      if (focusId === id) setFocusId(next);
    },
    [closeShell, count, focusId, order],
  );

  const movePane = useCallback(
    (id: string, dir: MoveDir) => {
      if (mobile) {
        const idx = order.indexOf(id);
        const other = dir === "left" || dir === "up" ? order[idx - 1] : order[idx + 1];
        if (other) setTree((t) => swap(t, id, other));
        return;
      }
      const target = neighbor(id, dir, rects());
      if (!target) return;
      const edge: Edge = dir === "left" ? "left" : dir === "right" ? "right" : dir === "up" ? "top" : "bottom";
      setTree((t) => move(t, id, target, edge));
    },
    [mobile, order, rects],
  );

  const swapNext = useCallback(
    (id: string) => {
      const idx = order.indexOf(id);
      const other = order[idx + 1] ?? order[idx - 1];
      if (other) setTree((t) => swap(t, id, other));
    },
    [order],
  );

  const focusDir = useCallback(
    (dir: MoveDir) => {
      const target = neighbor(focusId, dir, rects());
      if (target) setFocusId(target);
    },
    [focusId, rects],
  );

  const handleReset = useCallback(async () => {
    setNotice(null);
    await reset();
    cwdOf.current = new Map();
    setPanes((p) => p.map((x) => ({ ...x, startCwd: HOME })));
    setResetToken((n) => n + 1);
    // The reseed replaced the session's shells; reopen every extra one at
    // home so its next command does not land in a directory that is gone.
    for (const id of order) if (id !== "t1") void openShell(id, HOME);
  }, [openShell, order, reset]);

  // ── Drag to rearrange ────────────────────────────────────────────────
  const dragHandlers = useCallback(
    (id: string): PaneDragHandlers => ({
      onPointerDown: (e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ id, startX: e.clientX, startY: e.clientY, active: false, target: null });
      },
      onPointerMove: (e) => {
        setDrag((d) => {
          if (!d || d.id !== id) return d;
          const active = d.active || Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
          if (!active) return d;
          const under = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-pane]");
          const targetId = under?.dataset.pane;
          if (!under || !targetId || targetId === id) return { ...d, active, target: null };
          const r = under.getBoundingClientRect();
          const zone = zoneAt((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
          return { ...d, active, target: { id: targetId, zone } };
        });
      },
      onPointerUp: () => {
        setDrag((d) => {
          if (d?.active && d.target) {
            const { id: target, zone } = d.target;
            setTree((t) => (zone === "center" ? swap(t, d.id, target) : move(t, d.id, target, zone)));
          }
          return null;
        });
      },
      onPointerCancel: () => setDrag(null),
    }),
    [],
  );

  useEffect(() => {
    if (!drag?.active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrag(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drag?.active]);

  // ── Keyboard ─────────────────────────────────────────────────────────
  const onKeyDownCapture = (e: React.KeyboardEvent) => {
    if (!e.altKey) return;
    const shift = e.shiftKey;
    let handled = true;
    if (shift && e.key.toLowerCase() === "t") addPane(focusId, "row");
    else if (shift && e.key === "ArrowRight") addPane(focusId, "row");
    else if (shift && e.key === "ArrowDown") addPane(focusId, "col");
    else if (shift && e.key.toLowerCase() === "w") closePane(focusId);
    else if (!shift && e.key === "ArrowLeft") focusDir("left");
    else if (!shift && e.key === "ArrowRight") focusDir("right");
    else if (!shift && e.key === "ArrowUp") focusDir("up");
    else if (!shift && e.key === "ArrowDown") focusDir("down");
    else handled = false;
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  const titleOf = (id: string) => panes.find((p) => p.id === id)?.title ?? id;
  const focusedTitle = titleOf(focusId);

  const renderLeaf = (id: string) => {
    const rec = panes.find((p) => p.id === id);
    if (!rec) return null;
    return (
      <TerminalPane
        key={id}
        id={id}
        title={rec.title}
        session={session}
        startCwd={rec.startCwd}
        focused={focusId === id}
        hint={id === "t1" ? "A few files to poke at. Try ls, then cat README.md." : null}
        mobile={mobile}
        canClose={count > 1}
        canSplit={canSplit}
        resetToken={resetToken}
        dropZone={drag?.active && drag.target?.id === id ? drag.target.zone : null}
        drag={dragHandlers(id)}
        onFocus={() => setFocusId(id)}
        onClose={() => closePane(id)}
        onSplit={(dir) => addPane(id, dir)}
        onMove={(dir) => movePane(id, dir)}
        onSwapNext={() => swapNext(id)}
        onRename={(title) => setPanes((p) => p.map((x) => (x.id === id ? { ...x, title } : x)))}
        onCwdChange={(cwd) => cwdOf.current.set(id, cwd)}
      />
    );
  };

  return (
    <div className="playground-root" onKeyDownCapture={onKeyDownCapture}>
      {overlay.mounted && (
        <PlaygroundBootOverlay
          title="Bash"
          statusMessage={error ?? "Starting the shell…"}
          fraction={ready ? 1 : 0.6}
          error={Boolean(error)}
          className={overlay.fading ? "hidden" : ""}
        />
      )}

      <div className="playground-app">
        <header className="playground-header">
          <div className="logo">
            {!embedded && (
              <Link href="/" aria-label="Dataslope home" className="ds-logo-hover">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/dataslope-logo-blue.svg" alt="Dataslope logo" className="brand-logo ds-logo-mark" />
              </Link>
            )}
            {!embedded && (
              <Select.Root
                value="bash"
                onValueChange={(value) => {
                  const next = PLAYGROUNDS.find((p) => p.id === value);
                  if (next && next.id !== "bash") router.push(next.href);
                }}
              >
                <Select.Trigger className="playground-switcher" aria-label="Switch playground">
                  {(() => {
                    const Icon = LANGUAGE_ICONS.bash;
                    const factor = LANGUAGE_ICON_SIZE_FACTOR.bash ?? 1;
                    return Icon ? (
                      <span className="playground-switcher-lang-icon" style={{ color: "var(--text)" }} aria-hidden="true">
                        <Icon size={Math.round(16 * factor)} />
                      </span>
                    ) : null;
                  })()}
                  <Select.Value className="playground-switcher-label">Bash</Select.Value>
                  <Select.Icon className="playground-switcher-icon">
                    <svg viewBox="0 0 12 12" width={10} height={10}>
                      <polyline points="2,4 6,8 10,4" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Positioner className="playground-lang-switcher-positioner" sideOffset={6}>
                    <Select.Popup className="bui-select-popup playground-lang-switcher-popup">
                      {PLAYGROUNDS.map((p) => {
                        const Icon = LANGUAGE_ICONS[p.id];
                        const factor = LANGUAGE_ICON_SIZE_FACTOR[p.id] ?? 1;
                        return (
                          <Select.Item key={p.id} value={p.id} className="bui-select-item">
                            {Icon && (
                              <span className="bui-select-item-icon" aria-hidden="true">
                                <Icon size={Math.round(14 * factor)} />
                              </span>
                            )}
                            <Select.ItemText>{p.label}</Select.ItemText>
                          </Select.Item>
                        );
                      })}
                    </Select.Popup>
                  </Select.Positioner>
                </Select.Portal>
              </Select.Root>
            )}
          </div>

          <div className="header-sep" />

          <button
            type="button"
            className="bpg-btn"
            onClick={() => addPane(focusId, "row")}
            disabled={!ready || !canSplit}
            title={canSplit ? `New terminal beside ${focusedTitle}` : `Up to ${MAX_TERMINALS} terminals`}
            aria-label="New terminal"
          >
            <Plus size={14} aria-hidden="true" />
            <span className="bpg-btn-label">New</span>
          </button>

          {!mobile && (
            <Menu.Root>
              <Menu.Trigger className="bpg-btn" disabled={!ready || !canSplit} aria-label="Split the focused terminal">
                <SplitSquareHorizontal size={14} aria-hidden="true" />
                <span className="bpg-btn-label">Split</span>
                <ChevronDown size={12} aria-hidden="true" />
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner sideOffset={6} align="end" className={menuStyles.positioner}>
                  <Menu.Popup className={menuStyles.popup}>
                    <Menu.Item className={menuStyles.item} onClick={() => addPane(focusId, "row")}>
                      <SplitSquareHorizontal strokeWidth={1.8} aria-hidden />
                      <span className={menuStyles.itemLabel}>
                        Split right
                        <span className={menuStyles.itemNote}>Alt+Shift+→</span>
                      </span>
                    </Menu.Item>
                    <Menu.Item className={menuStyles.item} onClick={() => addPane(focusId, "col")}>
                      <SplitSquareVertical strokeWidth={1.8} aria-hidden />
                      <span className={menuStyles.itemLabel}>
                        Split down
                        <span className={menuStyles.itemNote}>Alt+Shift+↓</span>
                      </span>
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
          )}

          <button
            type="button"
            className="bpg-btn"
            onClick={() => void handleReset()}
            disabled={!ready}
            title="Start over with the starting files. Nothing here is saved."
            aria-label="Reset"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span className="bpg-btn-label">Reset</span>
          </button>
        </header>

        <h1 className="playground-sr-title">Bash Playground</h1>

        <div className={`playground-body bpg-body${drag?.active ? " dragging" : ""}`} ref={stage}>
          {mobile && (
            <nav className="bpg-tabs" aria-label="Terminals">
              {order.map((id) => (
                <span key={id} className={`bpg-tab${focusId === id ? " active" : ""}`}>
                  <button type="button" className="bpg-tab-btn" onClick={() => setFocusId(id)} aria-current={focusId === id}>
                    {titleOf(id)}
                  </button>
                  {focusId === id && count > 1 && (
                    <button type="button" className="bpg-tab-close" onClick={() => closePane(id)} aria-label={`Close ${titleOf(id)}`}>
                      <X size={12} aria-hidden="true" />
                    </button>
                  )}
                </span>
              ))}
              <button type="button" className="bpg-tab add" onClick={() => addPane(focusId, "row")} disabled={!ready || !canSplit} aria-label="New terminal">
                <Plus size={14} aria-hidden="true" />
              </button>
            </nav>
          )}

          <div className="bpg-stage" data-focus={focusId}>
            <SplitView node={tree} renderLeaf={renderLeaf} onResize={(id, ratio) => setTree((t) => resize(t, id, ratio))} />
          </div>

          {notice && (
            <div className="bpg-notice" role="status">
              {notice}
            </div>
          )}
          {drag?.active && (
            <div className="bpg-drag-ghost" aria-hidden="true">
              {titleOf(drag.id)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
