"use client";

/**
 * One terminal in the Bash playground: a title bar and a prompt.
 *
 * The title bar is the pane's handle. Its grip starts a drag to rearrange,
 * its name renames on double-click, its directory follows the shell, and its
 * menu holds everything the header does plus the moves a keyboard user needs
 * instead of dragging.
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Menu } from "@base-ui/react/menu";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowLeftRight,
  ClipboardCopy,
  Eraser,
  GripVertical,
  MoreHorizontal,
  PencilLine,
  SplitSquareHorizontal,
  SplitSquareVertical,
  X,
} from "lucide-react";
import { GitTerminal, type GitTerminalHandle } from "../git/GitTerminal";
import type { GitSession } from "../git/gitRuntime";
import menuStyles from "../sqlCardTools/SqlCardToolsMenu.module.css";
import { useShellPane } from "./useShellPane";
import type { Dir } from "./splitTree";

export type MoveDir = "left" | "right" | "up" | "down";

/** What the playground can ask a pane to do: put a command on its prompt
 *  (a "Try this" step, a palette row), or take the keyboard. */
export interface TerminalPaneHandle {
  compose: (command: string) => void;
  focus: () => void;
}

export interface PaneDragHandlers {
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: React.PointerEvent<HTMLElement>) => void;
}

interface Props {
  id: string;
  title: string;
  session: Pick<GitSession, "state" | "exec" | "ready">;
  /** Where this shell started; a split inherits its source's directory. */
  startCwd: string;
  focused: boolean;
  /** The scenario line, shown in the first terminal only, before anything
   *  has been typed. */
  hint?: string | null;
  /** True in the tab layout, where moves are left and right along the strip. */
  tabbed: boolean;
  /** Which moves are open to this pane right now; asked as the menu opens,
   *  so an edge pane shows its dead directions disabled. */
  moves: () => Record<MoveDir, boolean>;
  canSwap: boolean;
  canClose: boolean;
  canSplit: boolean;
  /** Bumped by Reset so the pane clears itself. */
  resetToken: number;
  /** The drop zone the pane is showing while another pane is dragged over it. */
  dropZone: string | null;
  drag: PaneDragHandlers;
  onFocus: () => void;
  onClose: () => void;
  onSplit: (dir: Dir) => void;
  onMove: (dir: MoveDir) => void;
  onSwapNext: () => void;
  onRename: (title: string) => void;
  /** The shell's directory, whenever it changes, so a split from this pane
   *  can start where it is standing. */
  onCwdChange?: (cwd: string) => void;
  /** Every line that ran to completion, for the session record. */
  onRan?: (command: string) => void;
  /** Lines to play once the session is ready: the pane's own history from
   *  before a reload, so the transcript and the shell come back together. */
  replay?: string[];
}

export const TerminalPane = forwardRef<TerminalPaneHandle, Props>(function TerminalPane({
  id,
  title,
  session,
  startCwd,
  focused,
  hint = null,
  tabbed,
  moves,
  canSwap,
  canClose,
  canSplit,
  resetToken,
  dropZone,
  drag,
  onFocus,
  onClose,
  onSplit,
  onMove,
  onSwapNext,
  onRename,
  onCwdChange,
  onRan,
  replay,
}: Props, ref) {
  const pane = useShellPane(session, { shell: id, startCwd, onRan });
  const termRef = useRef<GitTerminalHandle>(null);
  const replayed = useRef(false);

  useImperativeHandle(ref, () => ({
    compose: (command: string) => {
      pane.setInput(command);
      requestAnimationFrame(() => termRef.current?.focus());
    },
    focus: () => termRef.current?.focus(),
  }));

  // The pane's history from before a reload plays once the shell is up, so
  // the scrollback and the shell state come back together.
  const { runLines } = pane;
  useEffect(() => {
    if (!session.ready || !replay?.length || replayed.current) return;
    replayed.current = true;
    void runLines(replay);
  }, [session.ready, replay, runLines]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [can, setCan] = useState<Record<MoveDir, boolean>>({ left: true, right: true, up: true, down: true });
  const lastReset = useRef(resetToken);

  // Focus follows the model: when this pane becomes the focused one, its
  // prompt takes the keyboard.
  useEffect(() => {
    if (focused && renaming === null) termRef.current?.focus();
  }, [focused, renaming]);

  const { cwd } = pane;
  useEffect(() => {
    onCwdChange?.(cwd);
  }, [cwd, onCwdChange]);

  const { reset } = pane;
  useEffect(() => {
    if (lastReset.current === resetToken) return;
    lastReset.current = resetToken;
    reset();
  }, [resetToken, reset]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(pane.copyTranscript());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* a denied clipboard is not worth interrupting the session over */
    }
  }, [pane]);

  const commitRename = () => {
    const next = (renaming ?? "").trim();
    if (next) onRename(next);
    setRenaming(null);
  };

  const disabled = pane.busy || !session.ready;

  return (
    <section
      className={`bpg-pane${focused ? " focused" : ""}`}
      data-pane={id}
      aria-label={title}
      onPointerDownCapture={onFocus}
    >
      <header className="bpg-pane-head">
        <button
          type="button"
          className="bpg-grip"
          aria-label={`Drag ${title} to move it`}
          title="Drag to move this terminal"
          {...drag}
        >
          <GripVertical size={14} aria-hidden="true" />
        </button>

        {renaming === null ? (
          <button
            type="button"
            className="bpg-pane-title"
            onDoubleClick={() => setRenaming(title)}
            title="Double-click to rename"
          >
            {title}
          </button>
        ) : (
          <input
            className="bpg-pane-rename"
            value={renaming}
            onChange={(e) => setRenaming(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(null);
            }}
            aria-label="Terminal name"
            autoFocus
            spellCheck={false}
          />
        )}

        <span className="bpg-pane-cwd" title={pane.cwd}>
          {pane.prompt}
        </span>
        <span className="bpg-pane-sep" />

        <Menu.Root
          onOpenChange={(open) => {
            if (open) setCan(moves());
          }}
        >
          <Menu.Trigger className={`${menuStyles.trigger} bpg-pane-menu`} aria-label={`${title} menu`} title="More">
            <MoreHorizontal size={14} strokeWidth={2.2} aria-hidden />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner sideOffset={6} align="end" className={menuStyles.positioner}>
              <Menu.Popup className={menuStyles.popup}>
                {!tabbed && (
                  <>
                    <Menu.Item className={menuStyles.item} disabled={!canSplit} onClick={() => onSplit("row")}>
                      <SplitSquareHorizontal strokeWidth={1.8} aria-hidden />
                      <span className={menuStyles.itemLabel}>Split right</span>
                    </Menu.Item>
                    <Menu.Item className={menuStyles.item} disabled={!canSplit} onClick={() => onSplit("col")}>
                      <SplitSquareVertical strokeWidth={1.8} aria-hidden />
                      <span className={menuStyles.itemLabel}>Split down</span>
                    </Menu.Item>
                  </>
                )}
                <Menu.Item className={menuStyles.item} disabled={!can.left} onClick={() => onMove("left")}>
                  <ArrowLeft strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>Move left</span>
                </Menu.Item>
                <Menu.Item className={menuStyles.item} disabled={!can.right} onClick={() => onMove("right")}>
                  <ArrowRight strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>Move right</span>
                </Menu.Item>
                {!tabbed && (
                  <>
                    <Menu.Item className={menuStyles.item} disabled={!can.up} onClick={() => onMove("up")}>
                      <ArrowUp strokeWidth={1.8} aria-hidden />
                      <span className={menuStyles.itemLabel}>Move up</span>
                    </Menu.Item>
                    <Menu.Item className={menuStyles.item} disabled={!can.down} onClick={() => onMove("down")}>
                      <ArrowDown strokeWidth={1.8} aria-hidden />
                      <span className={menuStyles.itemLabel}>Move down</span>
                    </Menu.Item>
                  </>
                )}
                <Menu.Item className={menuStyles.item} disabled={!canSwap} onClick={onSwapNext}>
                  <ArrowLeftRight strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>Swap with next</span>
                </Menu.Item>
                <Menu.Item className={menuStyles.item} onClick={() => setRenaming(title)}>
                  <PencilLine strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>Rename</span>
                </Menu.Item>
                <Menu.Item className={menuStyles.item} onClick={pane.clear}>
                  <Eraser strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>Clear</span>
                </Menu.Item>
                <Menu.Item className={menuStyles.item} closeOnClick={false} onClick={() => void copy()}>
                  <ClipboardCopy strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>{copied ? "Copied" : "Copy transcript"}</span>
                </Menu.Item>
                <Menu.Item className={menuStyles.item} disabled={!canClose} onClick={onClose}>
                  <X strokeWidth={1.8} aria-hidden />
                  <span className={menuStyles.itemLabel}>Close</span>
                </Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>

        <button
          type="button"
          className="bpg-pane-close"
          onClick={onClose}
          disabled={!canClose}
          aria-label={canClose ? `Close ${title}` : "The last terminal stays open"}
          title={canClose ? "Close" : "The last terminal stays open"}
        >
          <X size={14} aria-hidden="true" />
        </button>
      </header>

      <div className="bpg-term">
        <GitTerminal
          ref={termRef}
          transcript={pane.transcript}
          value={pane.input}
          onValueChange={pane.setInput}
          onSubmit={(c) => void pane.submit(c)}
          history={pane.history}
          busy={disabled}
          completions={pane.completions}
          pathCompletions={pane.pathCompletions}
          prompt={pane.prompt}
          promptFor={pane.promptFor}
          placeholder=""
          inlineInput
          onWrite={pane.write}
          continuation={pane.continuation}
          onCancel={pane.cancel}
          queueWhileBusy
          placeholderHint={hint ? <p className="git-terminal-hint">{hint}</p> : null}
        />
      </div>

      {dropZone && (
        <div className="bpg-dropzone" data-zone={dropZone} aria-hidden="true">
          <span>{dropZone === "center" ? "Swap" : `Move ${dropZone === "top" ? "above" : dropZone === "bottom" ? "below" : dropZone}`}</span>
        </div>
      )}
    </section>
  );
});
