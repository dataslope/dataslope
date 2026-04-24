// Type declarations for the third-party JavaScript libraries we import from
// npm. CodeMirror v5 ships without TypeScript typings, so we narrowly
// describe just the surface area the playground actually uses.

export interface CodeMirrorEditor {
  setValue(value: string): void;
  getValue(): string;
  setOption(name: string, value: unknown): void;
  setSize(width: string | number | null, height: string | number | null): void;
  getWrapperElement(): HTMLElement;
  refresh(): void;
  focus(): void;
}

export interface CodeMirrorOptions {
  mode: string;
  theme: string;
  lineNumbers?: boolean;
  indentUnit?: number;
  tabSize?: number;
  indentWithTabs?: boolean;
  keyMap?: string;
  autoCloseBrackets?: boolean;
  matchBrackets?: boolean;
  lineWrapping?: boolean;
  extraKeys?: Record<string, () => void>;
}

export interface CodeMirrorAPI {
  fromTextArea(
    el: HTMLTextAreaElement,
    options: CodeMirrorOptions,
  ): CodeMirrorEditor;
}
