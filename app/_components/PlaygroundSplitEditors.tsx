"use client";

/**
 * CodePen-style split editors for the playground — one always-visible
 * CodeMirror editor per workspace file (HTML on top, then CSS, then
 * JS), stacked vertically in the editor pane instead of the tabbed
 * single editor. Offered by adapters that set `splitEditors` (web).
 *
 * State contract: the per-file dirty-buffer Map in the playground
 * store is the source of truth.
 *   - User edits here write through synchronously (`onChange` mirrors
 *     the main editor's persist listener: buffer + OPFS + dirty mark),
 *     so Run / snapshot paths that read buffers are always current.
 *   - External writes (loading an example, Close All) flow back in via
 *     the `buffers` prop: each editor replaces its doc when the buffer
 *     diverges, with a suppress flag so the replacement isn't echoed
 *     back out as a user edit.
 *
 * Focusing an editor reports the file as "active" so the Run button
 * label, Format target, and completion filename all track the pane the
 * user is working in — same semantics as focusing a tab.
 */

import { useEffect, useMemo, useRef } from "react";
import { EditorView, keymap, drawSelection, dropCursor, highlightActiveLine, highlightActiveLineGutter, lineNumbers as lineNumbersExt, rectangularSelection, crosshairCursor } from "@codemirror/view";
import { EditorState, Compartment } from "@codemirror/state";
import { history, defaultKeymap, historyKeymap, indentWithTab } from "@codemirror/commands";
import { indentOnInput, bracketMatching, indentUnit } from "@codemirror/language";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";

import { loadLanguage, themeFor, redoKeymap } from "./cmExtensions";
import { languageCompletion } from "./completion/languageCompletion";
import { aiInlineCompletion } from "./ai/inlineCompletion";
import type { PlaygroundFile } from "./playgroundTabs";
import type { LanguageAdapter, LanguageRuntime } from "./types";

export interface SplitEditorsProps {
  adapter: LanguageAdapter;
  files: PlaygroundFile[];
  /** The playground store's dirty-buffer map (fileId → contents). */
  buffers: Map<string, string>;
  /** File whose pane counts as "active" (focused). */
  activeFileId: string;
  editorTheme: string;
  wordWrap: boolean;
  /** Write-through for user edits (buffer + OPFS + dirty mark). */
  onChange: (fileId: string, content: string) => void;
  /** A pane gained focus — make its file the active one. */
  onFocusFile: (fileId: string) => void;
  /** Mod-Enter / Mod-Shift-Enter inside any pane. */
  onRun: () => void;
  onRunSecondary: () => void;
  /** Expose each pane's EditorView so Format/Copy can target the
   *  active pane. Called with `null` on teardown. */
  registerView: (fileId: string, view: EditorView | null) => void;
  getRuntime: () => LanguageRuntime | null;
}

/** Uppercase language chip for a pane header, CodePen-style. */
function paneLabel(filename: string): string {
  const dot = filename.lastIndexOf(".");
  const ext = dot === -1 ? "" : filename.slice(dot + 1).toLowerCase();
  switch (ext) {
    case "html":
    case "htm":
      return "HTML";
    case "css":
      return "CSS";
    case "js":
    case "mjs":
    case "cjs":
      return "JS";
    case "ts":
      return "TS";
    case "tsx":
    case "jsx":
      return "JSX";
    case "json":
      return "JSON";
    case "svg":
    case "xml":
      return "XML";
    default:
      return ext.toUpperCase() || "TXT";
  }
}

interface SplitEditorProps extends Omit<SplitEditorsProps, "files"> {
  file: PlaygroundFile;
}

function SplitEditor({
  adapter,
  file,
  buffers,
  activeFileId,
  editorTheme,
  wordWrap,
  onChange,
  onFocusFile,
  onRun,
  onRunSecondary,
  registerView,
  getRuntime,
}: SplitEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const themeCompRef = useRef<Compartment | null>(null);
  const wrapCompRef = useRef<Compartment | null>(null);
  // True while THIS component replaces the doc programmatically, so the
  // update listener doesn't echo the replacement back into the store.
  const suppressRef = useRef(false);

  // Callback props live in refs so the editor mounts exactly once per
  // file — the pattern every other editor mount in the app uses.
  const onChangeRef = useRef(onChange);
  const onFocusRef = useRef(onFocusFile);
  const onRunRef = useRef(onRun);
  const onRunSecondaryRef = useRef(onRunSecondary);
  const getRuntimeRef = useRef(getRuntime);
  useEffect(() => {
    onChangeRef.current = onChange;
    onFocusRef.current = onFocusFile;
    onRunRef.current = onRun;
    onRunSecondaryRef.current = onRunSecondary;
    getRuntimeRef.current = getRuntime;
  });
  const buffersRef = useRef(buffers);
  useEffect(() => {
    buffersRef.current = buffers;
  }, [buffers]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || viewRef.current) return;

    const themeComp = new Compartment();
    const wrapComp = new Compartment();
    const languageComp = new Compartment();

    const view = new EditorView({
      doc: buffersRef.current.get(file.id) ?? "",
      parent: host,
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        lineNumbersExt(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        rectangularSelection(),
        crosshairCursor(),
        EditorState.tabSize.of(adapter.indentWidth),
        indentUnit.of(" ".repeat(adapter.indentWidth)),
        languageCompletion({
          adapterId: adapter.id,
          getRuntime: () => getRuntimeRef.current(),
          getFilename: () => file.filename,
        }),
        aiInlineCompletion({
          language: adapter.id,
          filename: () => file.filename,
        }),
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRunRef.current();
              return true;
            },
          },
          {
            key: "Mod-Shift-Enter",
            run: () => {
              onRunSecondaryRef.current();
              return true;
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...redoKeymap,
          indentWithTab,
        ]),
        languageComp.of([]),
        themeComp.of([]),
        wrapComp.of([]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !suppressRef.current) {
            onChangeRef.current(file.id, update.state.doc.toString());
          }
          if (update.focusChanged && update.view.hasFocus) {
            onFocusRef.current(file.id);
          }
        }),
      ],
    });

    viewRef.current = view;
    themeCompRef.current = themeComp;
    wrapCompRef.current = wrapComp;
    registerView(file.id, view);

    const mode =
      adapter.codeMirrorModeForFile?.(file.filename) ?? adapter.codeMirrorMode;
    void loadLanguage(mode).then((ext) => {
      if (ext && viewRef.current === view) {
        view.dispatch({ effects: languageComp.reconfigure(ext) });
      }
    });

    return () => {
      registerView(file.id, null);
      view.destroy();
      viewRef.current = null;
      themeCompRef.current = null;
      wrapCompRef.current = null;
    };
    // Mount once per (file id, filename) — a rename remounts with the
    // right language mode; everything else flows through refs or
    // compartment reconfigures below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id, file.filename, adapter]);

  // Theme / word-wrap follow the playground settings.
  useEffect(() => {
    const view = viewRef.current;
    const comp = themeCompRef.current;
    if (view && comp) {
      view.dispatch({ effects: comp.reconfigure(themeFor(editorTheme)) });
    }
  }, [editorTheme]);
  useEffect(() => {
    const view = viewRef.current;
    const comp = wrapCompRef.current;
    if (view && comp) {
      view.dispatch({
        effects: comp.reconfigure(wordWrap ? EditorView.lineWrapping : []),
      });
    }
  }, [wordWrap]);

  // External buffer changes (example load, Close All, workspace
  // hydration) → replace the doc. User edits round-trip through the
  // store and compare equal here, so this never fights the cursor.
  const bufferValue = buffers.get(file.id);
  useEffect(() => {
    const view = viewRef.current;
    if (!view || bufferValue === undefined) return;
    if (view.state.doc.toString() === bufferValue) return;
    suppressRef.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: bufferValue },
        selection: { anchor: 0 },
      });
    } finally {
      suppressRef.current = false;
    }
  }, [bufferValue]);

  return (
    <section
      className={`split-editor-section${
        activeFileId === file.id ? " split-editor-section-active" : ""
      }`}
      aria-label={`${file.filename} editor`}
    >
      <header className="split-editor-header">
        <span className="split-editor-lang">{paneLabel(file.filename)}</span>
        <span className="split-editor-filename">{file.filename}</span>
      </header>
      <div className="split-editor-host" ref={hostRef} />
    </section>
  );
}

/** The stacked pane list. Rendered by the playground in place of the
 *  single tabbed editor when the split view is on. */
export default function PlaygroundSplitEditors(props: SplitEditorsProps) {
  const { files } = props;
  // Stable pane order: HTML first, then CSS, then JS, then anything
  // else — the CodePen convention — with filename ties broken
  // alphabetically. Files keep their identity (keyed by id) so
  // reordering tabs later doesn't remount editors.
  const ordered = useMemo(() => {
    const rank = (filename: string): number => {
      if (/\.html?$/i.test(filename)) return 0;
      if (/\.css$/i.test(filename)) return 1;
      if (/\.(js|mjs|cjs)$/i.test(filename)) return 2;
      return 3;
    };
    return [...files].sort(
      (a, b) =>
        rank(a.filename) - rank(b.filename) ||
        a.filename.localeCompare(b.filename),
    );
  }, [files]);

  return (
    <div className="split-editor-stack" role="group" aria-label="Editors">
      {ordered.map((file) => (
        <SplitEditor key={file.id} {...props} file={file} />
      ))}
    </div>
  );
}
