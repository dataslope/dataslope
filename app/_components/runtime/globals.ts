// Type declarations for the third-party JavaScript libraries we import from
// npm. CodeMirror v5 ships without TypeScript typings, so we narrowly
// describe just the surface area the playground actually uses.

export interface CodeMirrorPosition {
  line: number;
  ch: number;
}

export interface CodeMirrorEditor {
  setValue(value: string): void;
  getValue(): string;
  setOption(name: string, value: unknown): void;
  setSize(width: string | number | null, height: string | number | null): void;
  getWrapperElement(): HTMLElement;
  refresh(): void;
  focus(): void;
  setCursor(pos: CodeMirrorPosition): void;
  getCursor(): CodeMirrorPosition;
  getLine(line: number): string;
  showHint(options?: Record<string, unknown>): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  /** Tear the editor down and restore the original `<textarea>`. Used
   *  when React unmounts the host element so we don't leak DOM nodes. */
  toTextArea?(): void;
}

export interface CodeMirrorOptions {
  mode: string;
  theme: string;
  lineNumbers?: boolean;
  /** Line number shown for the first line. CodeMirror defaults to 1; we
   *  override this for code blocks with init-code so the user-editable
   *  region's gutter continues from where the init block left off. */
  firstLineNumber?: number;
  indentUnit?: number;
  tabSize?: number;
  indentWithTabs?: boolean;
  keyMap?: string;
  autoCloseBrackets?: boolean;
  matchBrackets?: boolean;
  lineWrapping?: boolean;
  extraKeys?: Record<string, string | (() => void)>;
  /** When set, the editor cannot be edited. `"nocursor"` additionally
   *  disables focus, which is the standard CodeMirror v5 way to render
   *  a code listing that still highlights syntax. */
  readOnly?: boolean | "nocursor";
}

export interface CodeMirrorHint {
  text: string;
  displayText?: string;
}

export interface CodeMirrorHintResult {
  list: CodeMirrorHint[] | string[];
  from: CodeMirrorPosition;
  to: CodeMirrorPosition;
}

export interface CodeMirrorAPI {
  fromTextArea(
    el: HTMLTextAreaElement,
    options: CodeMirrorOptions,
  ): CodeMirrorEditor;
  Pos(line: number, ch: number): CodeMirrorPosition;
  registerHelper(
    type: string,
    mode: string,
    helper: (
      cm: CodeMirrorEditor,
    ) => CodeMirrorHintResult | Promise<CodeMirrorHintResult | null | undefined> | null | undefined,
  ): void;
  commands: Record<string, (cm: CodeMirrorEditor) => void>;
}
