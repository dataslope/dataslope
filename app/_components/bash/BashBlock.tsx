"use client";

/**
 * A shell you type into, inside lesson prose.
 *
 * Not a textarea with a Run button: a prompt. The reader types a line, presses
 * Enter, reads the output, and types the next one, and the session remembers
 * where they are — `cd src` then `ls` lists `src`, a variable set on one line
 * is there on the next, a function they define stays defined. That state lives
 * in `ShellSession` in the worker, because just-bash scopes each `exec` to a
 * single call.
 *
 * `commands` is optional scaffolding rather than the point of the component:
 * a starting script the block plays for itself once the session is up, so the
 * reader arrives at a session already in progress and carries on from the
 * prompt at the bottom of it. There is no Run button to press first.
 *
 * It is played, not pasted. Each line goes through the same `exec` a typed
 * line does, so `mkdir myfolder` really creates the directory and the `cd
 * myfolder` after it really lands in it. A transcript hard-coded into the
 * page would show the same text and leave the reader in an empty shell.
 *
 * Blocks are isolated unless they share a `dir` id, so exploring in one block
 * cannot disturb another. The terminal itself is `useShellPane`, which the
 * Bash playground's split terminals share.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Terminal } from "lucide-react";
import { SiGnubash } from "react-icons/si";
import Link from "../Link";
import { useGitSession } from "../git/gitRuntime";
import { GitTerminal } from "../git/GitTerminal";
import { ShellToolsMenu } from "../shell/ShellToolsMenu";
import { DEFAULT_BASH_SCENARIO } from "./bashScenarios";
import { useShellPane } from "./useShellPane";
import "../shell/embeddedShell.css";
import "./bashPanels.css";

export interface BashBlockProps {
  /** Optional starting script, played once the session is ready, either as
   *  one newline-separated string or as a list of lines. The prompt stays live
   *  afterwards, so a reader keeps going from where it left them. */
  commands?: string | string[];
  /** Starting filesystem, by scenario id. */
  scenario?: string;
  /** Share a working directory with other blocks carrying the same id. */
  dir?: string;
  /** Rows the terminal shows before it scrolls. */
  rows?: number;
  /** Hide the link out to the full Bash playground. */
  hideOpenInPlayground?: boolean;
}

export default function BashBlock({
  commands,
  scenario = DEFAULT_BASH_SCENARIO,
  dir,
  rows = 10,
  hideOpenInPlayground = false,
}: BashBlockProps) {
  const script = useMemo(() => {
    const lines = Array.isArray(commands) ? commands : (commands ?? "").split("\n");
    return lines.map((line) => line.trim()).filter((line) => line !== "");
  }, [commands]);

  const session = useGitSession(scenario, dir, "bash");
  const { ready, error, reset } = session;
  const pane = useShellPane(session);
  /** Bumped by Reset, so the starting script plays again on a fresh tree. */
  const [runToken, setRunToken] = useState(0);
  /** Shades the header once the scrollback has content above the fold. */
  const [scrolled, setScrolled] = useState(false);
  const played = useRef(-1);

  // The starting script plays itself, so the reader lands on a session already
  // in progress rather than on a Run button. `played` guards StrictMode's
  // double effect and `runLines` changing identity mid-play, either of which
  // would run the example twice into one transcript.
  const { runLines } = pane;
  useEffect(() => {
    if (!ready || script.length === 0 || played.current === runToken) return;
    played.current = runToken;
    void runLines(script);
  }, [ready, runToken, script, runLines]);

  const resetBlock = useCallback(() => {
    pane.reset();
    setRunToken((n) => n + 1);
    void reset();
  }, [pane, reset]);

  const disabled = pane.busy || !ready;

  return (
    <div className="sblock-shell ds-striped-shell">
      <div className="sblock">
        <div className={scrolled ? "sblock-head scrolled" : "sblock-head"}>
          <span className="sblock-tag">
            <Terminal aria-hidden="true" /> Terminal
          </span>
          {dir && <span className="sblock-chain">{dir}</span>}
          <span className="sblock-head-sep" />
          <div className="sblock-head-meta">
            <span className="sblock-runtime">
              <SiGnubash aria-hidden="true" /> Bash
            </span>
            {!hideOpenInPlayground && (
              <Link href="/playground/bash" className="sblock-open" title="Open the full Bash playground">
                <ExternalLink size={12} aria-hidden="true" />
                <span>Playground</span>
              </Link>
            )}
            <ShellToolsMenu
              onReset={resetBlock}
              getCopyText={pane.copyTranscript}
              copyLabel="transcript"
              copyNote="Every command in this session and what it printed"
              disabled={disabled}
            />
          </div>
        </div>

        {error && <div className="sblock-notice error">{error}</div>}

        <div className="sblock-terminal" style={{ height: `${rows * 1.55 + 3.2}em` }}>
          <GitTerminal
            transcript={pane.transcript}
            value={pane.input}
            onValueChange={pane.setInput}
            onSubmit={(c) => void pane.submit(c)}
            history={pane.history}
            busy={disabled}
            completions={pane.completions}
            pathCompletions={pane.pathCompletions}
            // bash's own `\w$`: the working directory, then the `$`.
            prompt={pane.prompt}
            promptFor={pane.promptFor}
            placeholder=""
            inlineInput
            onWrite={pane.write}
            onScrolledChange={setScrolled}
            continuation={pane.continuation}
            onCancel={pane.cancel}
            queueWhileBusy
            placeholderHint={null}
          />
        </div>
      </div>
    </div>
  );
}
